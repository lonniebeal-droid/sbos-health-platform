import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from './supabaseClient';
import { getAuthService } from './services/authService';
import { mapDbRoleToUiRole } from './roleMapping';
import type { UserRow } from './db/database.types';
import type { Role } from '../types';

interface AuthContextType {
  configured: boolean;
  session: Session | null;
  profile: UserRow | null;
  role: Role | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUpPatient: (email: string, password: string, fullName: string) => Promise<void>;
  claimPatientEnrollment: (token: string) => Promise<string>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const auth = getAuthService();
    let unsub = () => {};
    (async () => {
      try {
        const s = await auth.getSession();
        setSession(s);
        if (s) setProfile(await auth.getCurrentProfile());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Auth init failed');
      } finally {
        setLoading(false);
      }
      unsub = auth.onAuthStateChange(async (s) => {
        setSession(s);
        try { setProfile(s ? await auth.getCurrentProfile() : null); } catch { setProfile(null); }
      });
    })();
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { session: s } = await getAuthService().signIn(email, password);
    setSession(s);
    setProfile(await getAuthService().getCurrentProfile());
  }, []);

  const signUpPatient = useCallback(async (email: string, password: string, fullName: string) => {
    setError(null);
    const { session: s } = await getAuthService().signUpPatient(email, password, fullName);
    if (s) {
      setSession(s);
      setProfile(await getAuthService().getCurrentProfile());
    }
  }, []);

  const claimPatientEnrollment = useCallback(async (token: string) => {
    setError(null);
    const patientId = await getAuthService().claimPatientEnrollment(token);
    setProfile(await getAuthService().getCurrentProfile());
    return patientId;
  }, []);

  const signOut = useCallback(async () => {
    await getAuthService().signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const role = profile ? mapDbRoleToUiRole(profile.role) : null;

  return (
    <AuthContext.Provider value={{ configured: isSupabaseConfigured, session, profile, role, loading, error, signIn, signUpPatient, claimPatientEnrollment, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
