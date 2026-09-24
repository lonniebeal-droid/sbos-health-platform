import { describe, it, expect, vi } from 'vitest';
import { createAuthService } from '../lib/services/authService';

function fakeAuthClient(authOverrides: Record<string, unknown>, rpc?: ReturnType<typeof vi.fn>) {
  return { auth: authOverrides, rpc: rpc ?? vi.fn() } as any;
}

describe('authService.signUpPatient', () => {
  it('sends only non-authoritative display metadata', async () => {
    const signUpMock = vi.fn(async (input: {
      email: string;
      password: string;
      options: { data: { full_name: string } };
    }) => ({
      data: { user: { id: 'new-user-1', email: input.email }, session: { access_token: 'tok-new' } },
      error: null,
    }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));
    const result = await svc.signUpPatient('patient@test.com', 'Password123!', 'Jane Doe');
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'patient@test.com',
      password: 'Password123!',
      options: { data: { full_name: 'Jane Doe' } },
    });
    const call = signUpMock.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call?.options.data).not.toHaveProperty('organization_id');
    expect(call?.options.data).not.toHaveProperty('role');
    expect(result.user.id).toBe('new-user-1');
  });

  it('supports email-confirmation signup with null session', async () => {
    const signUpMock = vi.fn(async () => ({ data: { user: { id: 'new-user-2' }, session: null }, error: null }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));
    const result = await svc.signUpPatient('patient2@test.com', 'Password123!', 'John Smith');
    expect(result.session).toBeNull();
  });

  it('throws provider errors and missing-user results', async () => {
    const providerFail = createAuthService(fakeAuthClient({ signUp: vi.fn(async () => ({ data: {}, error: { message: 'User already registered' } })) }));
    await expect(providerFail.signUpPatient('existing@test.com', 'Password123!', 'Duplicate')).rejects.toThrow('User already registered');
    const noUser = createAuthService(fakeAuthClient({ signUp: vi.fn(async () => ({ data: { user: null, session: null }, error: null })) }));
    await expect(noUser.signUpPatient('none@test.com', 'Password123!', 'Ghost')).rejects.toThrow('Sign-up returned no user');
  });
});

describe('authService.claimPatientEnrollment', () => {
  it('passes only the enrollment token to the trusted RPC', async () => {
    const rpc = vi.fn(async () => ({ data: 'patient-123', error: null }));
    const svc = createAuthService(fakeAuthClient({}, rpc));
    await expect(svc.claimPatientEnrollment('a'.repeat(64))).resolves.toBe('patient-123');
    expect(rpc).toHaveBeenCalledWith('claim_patient_enrollment', { p_token: 'a'.repeat(64) });
  });

  it('rejects short tokens before RPC and propagates server rejection', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { message: 'enrollment email does not match authenticated user' } }));
    const svc = createAuthService(fakeAuthClient({}, rpc));
    await expect(svc.claimPatientEnrollment('short')).rejects.toThrow('Invalid enrollment token');
    expect(rpc).not.toHaveBeenCalled();
    await expect(svc.claimPatientEnrollment('b'.repeat(64))).rejects.toThrow('enrollment email does not match authenticated user');
  });
});

describe('authService.signIn/signOut', () => {
  it('rejects bad credentials and missing sessions', async () => {
    const bad = createAuthService(fakeAuthClient({ signInWithPassword: vi.fn(async () => ({ data: {}, error: { message: 'Invalid login credentials' } })) }));
    await expect(bad.signIn('bad@test.com', 'wrong')).rejects.toThrow('Invalid login credentials');
    const missing = createAuthService(fakeAuthClient({ signInWithPassword: vi.fn(async () => ({ data: { user: { id: 'u1' }, session: null }, error: null })) }));
    await expect(missing.signIn('a@b.com', 'pw')).rejects.toThrow('Sign-in returned no session');
  });

  it('signs out successfully and propagates sign-out errors', async () => {
    const ok = createAuthService(fakeAuthClient({ signOut: vi.fn(async () => ({ error: null })) }));
    await expect(ok.signOut()).resolves.toBeUndefined();
    const fail = createAuthService(fakeAuthClient({ signOut: vi.fn(async () => ({ error: { message: 'Network error during sign-out' } })) }));
    await expect(fail.signOut()).rejects.toThrow('Network error during sign-out');
  });
});
