// Authentication service: a thin, real wrapper over Supabase Auth plus the
// application profile (public.users). Factory-based for unit testing with a fake
// client; the app uses getAuthService() which binds the configured client.
//
// This REPLACES the fake `/api/auth/login` flow (which ignored passwords and
// returned a fabricated token). Sessions are real Supabase JWTs.

import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { requireSupabase } from '../supabaseClient';
import { createRepositories } from '../repositories';
import type { UserRow } from '../db/database.types';

export interface SignInResult {
  user: User;
  session: Session;
}

export interface SignUpResult {
  user: User;
  session: Session | null;
}

export function createAuthService(client: SupabaseClient) {
  const repos = createRepositories(client);

  return {
    /** Real password sign-in. Throws with the provider message on failure. */
    async signIn(email: string, password: string): Promise<SignInResult> {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session || !data.user) throw new Error('Sign-in returned no session.');
      return { user: data.user, session: data.session };
    },

    /**
     * Register a new patient user. Creates both the Supabase Auth user and
     * the public.users profile row (via the handle_new_user trigger). The
     * role is always 'patient' — provider/admin accounts are created via
     * the admin dashboard or service-role, never self-service.
     *
     * Returns the new user and session (when auto-confirm is enabled) or
     * null session (when email confirmation is required).
     */
    async signUpPatient(
      email: string,
      password: string,
      fullName: string,
      organizationId?: string,
    ): Promise<SignUpResult> {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'patient',
            ...(organizationId ? { organization_id: organizationId } : {}),
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign-up returned no user.');
      return { user: data.user, session: data.session };
    },

    async signOut(): Promise<void> {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async getSession(): Promise<Session | null> {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      return data.session;
    },

    async getAuthUser(): Promise<User | null> {
      const { data, error } = await client.auth.getUser();
      if (error) return null; // no/expired session is not exceptional
      return data.user;
    },

    /** The application profile row for the signed-in user, or null. */
    async getCurrentProfile(): Promise<UserRow | null> {
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      return repos.users.getById(data.user.id);
    },

    /** Subscribe to auth changes; returns an unsubscribe function. */
    onAuthStateChange(cb: (session: Session | null) => void): () => void {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(session));
      return () => data.subscription.unsubscribe();
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

export function getAuthService(): AuthService {
  return createAuthService(requireSupabase());
}
