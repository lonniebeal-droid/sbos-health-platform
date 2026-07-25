import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client. Reads Vite-exposed env vars (must be prefixed VITE_).
// For local dev these come from `supabase start` output; see .env.example.
//
// This is the single seam through which the front end talks to the real backend.
// Until every mock is migrated, components may still import from src/data/mock*;
// track that migration in CODE_AUDIT.md §3.

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when both Supabase env vars are present. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The Supabase client, or `null` when env vars are absent (e.g. a fresh clone
 * with no `.env`). Callers must handle the null case so the UI degrades cleanly
 * instead of crashing.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

/**
 * Returns the configured client or throws. Use inside data-access code that
 * cannot function without a backend, so the failure is explicit rather than a
 * downstream `null` dereference.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).',
    );
  }
  return supabase;
}
