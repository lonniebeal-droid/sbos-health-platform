import { describe, it, expect, vi } from 'vitest';
import { createAuthService } from '../lib/services/authService';

// ---- Tests for authService.signUpPatient ----
// Uses a fake Supabase client (no real backend). Verifies the signup method
// calls the correct Supabase Auth API with the right metadata.

function fakeAuthClient(overrides: Record<string, unknown>) {
  return { auth: overrides } as any;
}

describe('authService.signUpPatient', () => {
  it('calls signUp with patient role metadata', async () => {
    const signUpMock = vi.fn(async () => ({
      data: {
        user: { id: 'new-user-1', email: 'patient@test.com' },
        session: { access_token: 'tok-new' },
      },
      error: null,
    }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));

    const result = await svc.signUpPatient('patient@test.com', 'Password123!', 'Jane Doe', 'org-1');

    expect(signUpMock).toHaveBeenCalledOnce();
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'patient@test.com',
      password: 'Password123!',
      options: {
        data: {
          full_name: 'Jane Doe',
          role: 'patient',
          organization_id: 'org-1',
        },
      },
    });
    expect(result.user.id).toBe('new-user-1');
    expect(result.session?.access_token).toBe('tok-new');
  });

  it('calls signUp without organizationId when not provided', async () => {
    const signUpMock = vi.fn(async () => ({
      data: {
        user: { id: 'new-user-2', email: 'patient2@test.com' },
        session: null,
      },
      error: null,
    }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));

    const result = await svc.signUpPatient('patient2@test.com', 'Password123!', 'John Smith');

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'patient2@test.com',
      password: 'Password123!',
      options: {
        data: {
          full_name: 'John Smith',
          role: 'patient',
        },
      },
    });
    expect(result.user.id).toBe('new-user-2');
    expect(result.session).toBeNull();
  });

  it('throws the provider error message on failure', async () => {
    const signUpMock = vi.fn(async () => ({
      data: {},
      error: { message: 'User already registered' },
    }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));

    await expect(
      svc.signUpPatient('existing@test.com', 'Password123!', 'Duplicate User'),
    ).rejects.toThrow('User already registered');
  });

  it('throws when signUp returns no user', async () => {
    const signUpMock = vi.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    }));
    const svc = createAuthService(fakeAuthClient({ signUp: signUpMock }));

    await expect(
      svc.signUpPatient('no-user@test.com', 'Password123!', 'Ghost User'),
    ).rejects.toThrow('Sign-up returned no user');
  });
});

describe('authService.signIn', () => {
  it('throws the provider error message on bad credentials', async () => {
    const signInMock = vi.fn(async () => ({
      data: {},
      error: { message: 'Invalid login credentials' },
    }));
    const svc = createAuthService(fakeAuthClient({ signInWithPassword: signInMock }));

    await expect(svc.signIn('bad@test.com', 'wrong')).rejects.toThrow('Invalid login credentials');
  });

  it('throws when signIn returns no session', async () => {
    const signInMock = vi.fn(async () => ({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    }));
    const svc = createAuthService(fakeAuthClient({ signInWithPassword: signInMock }));

    await expect(svc.signIn('a@b.com', 'pw')).rejects.toThrow('Sign-in returned no session');
  });
});

describe('authService.signOut', () => {
  it('throws the provider error message on failure', async () => {
    const signOutMock = vi.fn(async () => ({
      error: { message: 'Network error during sign-out' },
    }));
    const svc = createAuthService(fakeAuthClient({ signOut: signOutMock }));

    await expect(svc.signOut()).rejects.toThrow('Network error during sign-out');
  });

  it('succeeds when signOut returns no error', async () => {
    const signOutMock = vi.fn(async () => ({ error: null }));
    const svc = createAuthService(fakeAuthClient({ signOut: signOutMock }));

    await expect(svc.signOut()).resolves.toBeUndefined();
  });
});
