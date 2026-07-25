-- ====================================================================
-- SBOS — Supabase Auth integration + real Row-Level Security
-- Migration: 20260725000000_auth_integration_rls.sql
--
-- Fixes P0 items from SECURITY_AUDIT.md:
--   * removes the allow-all (`OR TRUE`) policies from the enterprise schema
--   * links public.users to auth.users (Supabase Auth is the identity source)
--   * drops users.password_hash (passwords live only in auth.users)
--   * enables RLS on ALL tenant tables with real organization isolation
--
-- NOTE: write-side RBAC (e.g. only providers may write prescriptions) is
-- enforced in the service layer (src/lib/permissions.ts) for now; these policies
-- enforce TENANT isolation. Tightening per-role writes in RLS is future work.
-- ====================================================================

-- 1. Remove the broken permissive policies from the enterprise migration.
DROP POLICY IF EXISTS tenant_isolation_organizations ON public.organizations;
DROP POLICY IF EXISTS patient_data_access ON public.patients;

-- 2. public.users becomes a profile table keyed to auth.users(id).
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.users
  ADD CONSTRAINT users_id_auth_fkey FOREIGN KEY (id)
  REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add a uniform tenant column to the tables that lacked one, so isolation is
--    consistent across every PHI table.
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.prior_authorizations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 4. Helper functions (SECURITY DEFINER so they bypass RLS and avoid recursion
--    when referenced inside policies).
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- 5. Auto-provision a profile row when a Supabase Auth user is created.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'patient'),
    (NEW.raw_user_meta_data->>'organization_id')::uuid
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Enable RLS on tables not already covered by the enterprise migration.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prior_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
-- organizations, patients, claims, audit_logs already have RLS enabled.

-- 7. Policies.

-- Organizations: the tenant DIRECTORY is not PHI and is needed pre-login (tenant
-- picker / subdomain routing), so it is publicly readable. Writes are
-- service-role only (no write policy => denied for anon/authenticated).
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO anon, authenticated USING (true);

-- Users/profiles: you can see your own row and same-org profiles; edit only self.
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = public.current_user_org_id());
CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- PHI tables: strict tenant isolation for authenticated users.
CREATE POLICY patients_tenant ON public.patients
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY providers_tenant ON public.providers
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY appointments_tenant ON public.appointments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY prescriptions_tenant ON public.prescriptions
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY prior_auths_tenant ON public.prior_authorizations
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY lab_results_tenant ON public.lab_results
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

-- Claims are keyed to the payer org. Provider-side visibility is future work.
CREATE POLICY claims_payer_tenant ON public.claims
  FOR ALL TO authenticated
  USING (payer_organization_id = public.current_user_org_id())
  WITH CHECK (payer_organization_id = public.current_user_org_id());

-- Audit logs: append-only, readable within your org (no UPDATE/DELETE policy).
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org_id());

-- 8. Table privileges. RLS only filters rows AFTER a role has table-level
--    privilege, so these grants are required (tables created in raw SQL
--    migrations do not inherit Supabase's default grants). Row visibility is
--    still governed by the policies above.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon may read only the (non-PHI) organization directory.
GRANT SELECT ON public.organizations TO anon;

-- authenticated gets DML on tenant tables; policies enforce org isolation.
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.providers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prior_authorizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
