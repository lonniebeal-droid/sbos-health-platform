import { describe, it, expect, vi } from 'vitest';
import { rateLimit } from '../server';

// Minimal Express-ish req/res doubles for exercising the middleware in isolation.
function mockCtx(ip: string) {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
    headers,
    setHeader(k: string, v: string) {
      headers[k] = String(v);
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const req: any = { ip, socket: { remoteAddress: ip } };
  const next = vi.fn();
  return { req, res, next };
}

describe('rateLimit', () => {
  it('allows requests up to the max, then returns 429 with Retry-After', () => {
    const mw = rateLimit({ windowMs: 60_000, max: 3, key: 'allow' });

    for (let i = 0; i < 3; i++) {
      const { req, res, next } = mockCtx('10.0.0.1');
      mw(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.statusCode).toBe(200);
    }

    // 4th request in the window is blocked.
    const { req, res, next } = mockCtx('10.0.0.1');
    mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeDefined();
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0);
    expect(String((res.body as any).error)).toMatch(/too many/i);
  });

  it('tracks each client IP independently', () => {
    const mw = rateLimit({ windowMs: 60_000, max: 1, key: 'per-ip' });

    const a = mockCtx('1.1.1.1');
    mw(a.req, a.res, a.next);
    expect(a.next).toHaveBeenCalledOnce();

    // A different IP still gets its own allowance.
    const b = mockCtx('2.2.2.2');
    mw(b.req, b.res, b.next);
    expect(b.next).toHaveBeenCalledOnce();

    // The first IP is now over its limit.
    const a2 = mockCtx('1.1.1.1');
    mw(a2.req, a2.res, a2.next);
    expect(a2.next).not.toHaveBeenCalled();
    expect(a2.res.statusCode).toBe(429);
  });

  it('resets the window after windowMs elapses', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      const mw = rateLimit({ windowMs: 1_000, max: 1, key: 'reset' });

      const first = mockCtx('3.3.3.3');
      mw(first.req, first.res, first.next);
      expect(first.next).toHaveBeenCalledOnce();

      // Still inside the window -> blocked.
      const blocked = mockCtx('3.3.3.3');
      mw(blocked.req, blocked.res, blocked.next);
      expect(blocked.res.statusCode).toBe(429);

      // Advance past the window -> allowed again.
      nowSpy.mockReturnValue(1_000_000 + 1_001);
      const after = mockCtx('3.3.3.3');
      mw(after.req, after.res, after.next);
      expect(after.next).toHaveBeenCalledOnce();
      expect(after.res.statusCode).toBe(200);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('falls back to a stable key when req.ip is absent', () => {
    const mw = rateLimit({ windowMs: 60_000, max: 1, key: 'fallback' });

    const req: any = { socket: {} }; // no ip, no remoteAddress -> 'unknown'
    const res1: any = mockCtx('x').res;
    const next1 = vi.fn();
    mw(req, res1, next1);
    expect(next1).toHaveBeenCalledOnce();

    const res2: any = mockCtx('x').res;
    const next2 = vi.fn();
    mw({ socket: {} } as any, res2, next2);
    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(429);
  });
});
