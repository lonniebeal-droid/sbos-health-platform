-- SBOS HealthOS — secure profile provisioning + tenant-isolation RLS
--
-- Fixes the "no hosted Supabase migration was applied" gap left by the
-- profile-provisioning migration added earlier: that migration assumed
-- current_user_org_id(), current_user_role(), and a users.phone column that
-- do not exist on this project's actual live schema (it was only ever
-- verified against a local reset that replays older, incompatible
-- migrations). This migration defines those prerequisites fresh against the
-- real live schema, then enables RLS across every table with real policies.
--
-- Scope: this establishes TENANT isolation (every row is only visible to
-- authenticated users in the same organization) plus the anti-privilege-
-- escalation signup fix. It does NOT implement per-role write RBAC (e.g.
-- "only providers may write prescriptions") — that is still future work,
-- same as disclosed in the PR that first proposed this hardening.

-- 1. users.id must line up with auth.users(id) for auth.uid() to resolve a
--    profile. password_hash is dead (the app uses Supabase Auth exclusively
--    via authService.ts's signInWithPassword/getUser — verified no code
--    reads or writes this column), so it is dropped rather than left as an
--    unused, unencrypted-credential-shaped column.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_auth_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_fkey FOREIGN KEY (id)
      REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Helper functions used inside RLS policies. SECURITY DEFINER so they can
--    read public.users (bypassing RLS) without causing policy recursion when
--    referenced from a policy defined ON public.users itself.
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_org_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- 3. Auto-provision a profile row when someone signs up through Supabase
--    Auth. Signup metadata is client-controlled, so role/org are NEVER read
--    from it — every new signup lands as an unassigned patient, matching the
--    live users_role_check constraint's default-safest value. Real role/org
--    assignment must go through a trusted administrative path (not built
--    yet — same gap disclosed previously).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, organization_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    'patient',
    NULL,
    true
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS can restrict rows but not individual columns. Restrict self-service
--    profile edits to a non-authorization field so a signed-in user cannot
--    promote their own role or move themselves to a different tenant via a
--    plain UPDATE. (No users.phone column exists live — phone lives on
--    patients — so only full_name is grantable here.)
REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (full_name) ON public.users TO authenticated;

-- 5. Lock down anon to the public tenant directory only; every other table
--    is authenticated-only via the policies below.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.organizations TO anon;

-- 6. Enable RLS everywhere.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedure_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounter_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_denials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prior_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Policies.

-- Organizations: the tenant directory is not PHI and is needed pre-login
-- (tenant picker / login routing), so it stays publicly readable. Writes are
-- service-role only (no write policy => denied for anon/authenticated).
DROP POLICY IF EXISTS organizations_read ON public.organizations;
CREATE POLICY organizations_read ON public.organizations
  FOR SELECT TO anon, authenticated USING (true);

-- Users/profiles: see your own row or a same-org colleague's; edit only your
-- own row, and only through the column grant above.
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Every other table carries a NOT NULL organization_id: strict tenant
-- isolation for authenticated users. Per-role write restrictions within a
-- tenant are not yet enforced here (service layer only) — future work.
DROP POLICY IF EXISTS patients_tenant ON public.patients;
CREATE POLICY patients_tenant ON public.patients
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS insurance_info_tenant ON public.insurance_info;
CREATE POLICY insurance_info_tenant ON public.insurance_info
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS encounters_tenant ON public.encounters;
CREATE POLICY encounters_tenant ON public.encounters
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS diagnosis_codes_tenant ON public.diagnosis_codes;
CREATE POLICY diagnosis_codes_tenant ON public.diagnosis_codes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS procedure_codes_tenant ON public.procedure_codes;
CREATE POLICY procedure_codes_tenant ON public.procedure_codes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS encounter_diagnoses_tenant ON public.encounter_diagnoses;
CREATE POLICY encounter_diagnoses_tenant ON public.encounter_diagnoses
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS encounter_procedures_tenant ON public.encounter_procedures;
CREATE POLICY encounter_procedures_tenant ON public.encounter_procedures
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claims_tenant ON public.claims;
CREATE POLICY claims_tenant ON public.claims
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claim_lines_tenant ON public.claim_lines;
CREATE POLICY claim_lines_tenant ON public.claim_lines
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claim_status_events_tenant ON public.claim_status_events;
CREATE POLICY claim_status_events_tenant ON public.claim_status_events
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claim_payments_tenant ON public.claim_payments;
CREATE POLICY claim_payments_tenant ON public.claim_payments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claim_adjustments_tenant ON public.claim_adjustments;
CREATE POLICY claim_adjustments_tenant ON public.claim_adjustments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS claim_denials_tenant ON public.claim_denials;
CREATE POLICY claim_denials_tenant ON public.claim_denials
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS appointments_tenant ON public.appointments;
CREATE POLICY appointments_tenant ON public.appointments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS prior_authorizations_tenant ON public.prior_authorizations;
CREATE POLICY prior_authorizations_tenant ON public.prior_authorizations
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS prescriptions_tenant ON public.prescriptions;
CREATE POLICY prescriptions_tenant ON public.prescriptions
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS lab_results_tenant ON public.lab_results;
CREATE POLICY lab_results_tenant ON public.lab_results
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS medical_records_tenant ON public.medical_records;
CREATE POLICY medical_records_tenant ON public.medical_records
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

-- Audit logs: append-only. Readable within your org; insertable for your own
-- org; no UPDATE/DELETE policy at all, so both are denied outright.
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org_id());
