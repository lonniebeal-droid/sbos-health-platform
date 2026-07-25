import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRepositories } from '../lib/repositories';
import { createAuthService } from '../lib/services/authService';
import { createOrganizationService } from '../lib/services/organizationService';
import { createEligibilityService } from '../lib/services/eligibilityService';

// ---- Minimal fake Supabase query builder ----
// Records the chained operations and resolves to a caller-supplied result. The
// builder is thenable, mirroring supabase-js where awaiting the builder runs the
// query. `handler(table, ops)` returns { data, error }.
type Result = { data: unknown; error: { message: string } | null };
function fakeClient(handler: (table: string, ops: unknown[][]) => Result): SupabaseClient {
  const client = {
    from(table: string) {
      const ops: unknown[][] = [];
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'order', 'eq', 'insert', 'update']) {
        builder[m] = (...args: unknown[]) => { ops.push([m, ...args]); return builder; };
      }
      for (const m of ['single', 'maybeSingle']) {
        builder[m] = () => { ops.push([m]); return builder; };
      }
      builder.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(handler(table, ops)).then(resolve, reject);
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

describe('repositories', () => {
  it('organizations.list returns rows ordered by name', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: [{ id: 'o1', name: 'A' }], error: null };
    }));
    const rows = await repos.organizations.list();
    expect(seenTable).toBe('organizations');
    expect(seenOps).toContainEqual(['order', 'name']);
    expect(rows).toHaveLength(1);
  });

  it('unwrap throws the Postgrest error message', async () => {
    const repos = createRepositories(fakeClient(() => ({ data: null, error: { message: 'RLS denied' } })));
    await expect(repos.patients.list()).rejects.toThrow('RLS denied');
  });

  it('appointments.updateStatus issues an update + eq filter', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: { id: 'a1', status: 'cancelled' }, error: null };
    }));
    const row = await repos.appointments.updateStatus('a1', 'cancelled');
    expect(seenOps).toContainEqual(['update', { status: 'cancelled' }]);
    expect(seenOps).toContainEqual(['eq', 'id', 'a1']);
    expect(row.status).toBe('cancelled');
  });

  it('prescriptions.requestRefill sets refill_requested status', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: { id: 'rx1', status: 'refill_requested' }, error: null };
    }));
    await repos.prescriptions.requestRefill('rx1');
    expect(seenOps).toContainEqual(['update', { status: 'refill_requested' }]);
  });
});

describe('organizationService', () => {
  it('maps rows to TenantOrg view', async () => {
    const svc = createOrganizationService(fakeClient(() => ({
      data: [{ id: 'o1', name: 'Bay Area', type: 'health_system', tax_id: null, npi: '123', created_at: '', updated_at: '' }],
      error: null,
    })));
    const orgs = await svc.listOrganizations();
    expect(orgs[0]).toMatchObject({ id: 'o1', name: 'Bay Area', npiOrTaxId: 'NPI: 123' });
  });
});

describe('authService', () => {
  function authClient(overrides: Record<string, unknown>): SupabaseClient {
    return { auth: overrides } as unknown as SupabaseClient;
  }

  it('signIn returns user + session on success', async () => {
    const svc = createAuthService(authClient({
      signInWithPassword: async () => ({
        data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null,
      }),
    }));
    const res = await svc.signIn('a@b.com', 'pw');
    expect(res.user.id).toBe('u1');
    expect(res.session.access_token).toBe('t');
  });

  it('signIn throws the provider error message', async () => {
    const svc = createAuthService(authClient({
      signInWithPassword: async () => ({ data: {}, error: { message: 'Invalid login credentials' } }),
    }));
    await expect(svc.signIn('a@b.com', 'bad')).rejects.toThrow('Invalid login credentials');
  });

  it('getAuthUser returns null when there is no session', async () => {
    const svc = createAuthService(authClient({
      getUser: async () => ({ data: { user: null }, error: { message: 'no session' } }),
    }));
    expect(await svc.getAuthUser()).toBeNull();
  });
});

describe('eligibilityService', () => {
  it('calls the check_eligibility RPC and returns the coverage summary', async () => {
    let seenArgs: unknown;
    const client = {
      rpc: async (_fn: string, args: unknown) => {
        seenArgs = args;
        return { data: { status: 'ACTIVE_ELIGIBLE', memberId: 'M1', planName: 'Gold PPO' }, error: null };
      },
    } as unknown as SupabaseClient;
    const svc = createEligibilityService(client);
    const r = await svc.check('M1');
    expect(seenArgs).toEqual({ p_member_id: 'M1' });
    expect(r.status).toBe('ACTIVE_ELIGIBLE');
    expect(r.planName).toBe('Gold PPO');
  });

  it('throws the RPC error message', async () => {
    const client = {
      rpc: async () => ({ data: null, error: { message: 'Not authorized for eligibility inquiry' } }),
    } as unknown as SupabaseClient;
    const svc = createEligibilityService(client);
    await expect(svc.check('M1')).rejects.toThrow('Not authorized');
  });
});
