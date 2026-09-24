// Authentication service: a thin, real wrapper over Supabase Auth plus the
// application profile (public.users). Factory-based for unit testing with a fake
// client; the app uses getAuthService() which binds the configured client.
//
// Sessions are real Supabase JWTs. Patient tenant linkage is deliberately NOT
// accepted from self-service client metadata; trusted enrollment RPCs own that.

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
    async signIn(email: string, password: string): Promise<SignInResult> {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session || !data.user) throw new Error('Sign-in returned no session.');
      return { user: data.user, session: data.session };
    },

    /**
     * Register a self-service patient identity. The client may supply only
     * non-authoritative display metadata. Role and organization ownership are
     * established by trusted database logic, never by client-selected metadata.
     */
    async signUpPatient(email: string, password: string, fullName: string): Promise<SignUpResult> {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign-up returned no user.');
      return { user: data.user, session: data.session };
    },

    /**
     * Claim a pre-existing patient enrollment. The token is the only client
     * input; patient id, organization id and patient role are resolved and
     * enforced server-side by public.claim_patient_enrollment/private internals.
     */
    async claimPatientEnrollment(token: string): Promise<string> {
      const normalized = token.trim();
      if (normalized.length < 32) throw new Error('Invalid enrollment token.');
      const { data, error } = await client.rpc('claim_patient_enrollment', { p_token: normalized });
      if (error) throw new Error(error.message);
      if (typeof data !== 'string' || !data) throw new Error('Enrollment claim returned no patient id.');
      return data;
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
      if (error) return null;
      return data.user;
    },

    async getCurrentProfile(): Promise<UserRow | null> {
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      return repos.users.getById(data.user.id);
    },

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
