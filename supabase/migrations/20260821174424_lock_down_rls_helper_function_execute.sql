-- REVOKE ... FROM PUBLIC does not strip grants that Supabase's default
-- privileges already applied directly to anon/authenticated at function
-- creation time (confirmed via get_advisors after the prior migration).
-- These functions must not be callable via PostgREST RPC by anyone —
-- current_user_org_id/current_user_role are internal to RLS policies, and
-- handle_new_user is a trigger function only.
REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- Policies still need authenticated to evaluate these functions internally;
-- SQL/plpgsql functions invoked from within a policy run as the defining
-- role's rights (SECURITY DEFINER), not the caller's EXECUTE grant, but
-- Postgres still requires the calling role to hold EXECUTE to invoke it at
-- all — including implicitly from a policy expression. Grant back to
-- authenticated only (never anon, never PUBLIC) for the two helpers actually
-- referenced inside policies.
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
