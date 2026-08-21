-- Per-role write RBAC — the gap disclosed (and left open) by every RLS
-- migration so far this project. Investigated the actual app code first
-- (src/lib/repositories.ts, src/components/**) rather than inventing rules:
-- there is currently NO role enforcement anywhere in the app layer — a
-- Permission/hasPermission scaffold exists in src/lib/permissions.ts but is
-- dead code (only referenced by its own test), and the portal persona
-- switcher in Header.tsx lets any signed-in user open any role's UI, which
-- then calls repositories.ts with no role check at all. Prior migrations in
-- this project only enforced tenant (organization_id) isolation, which does
-- not stop a patient-role account from writing clinical or billing data
-- within its own org. This migration is the actual enforcement layer.
--
-- Design grounded in the real write paths found in the app:
--   - patients/insurance_info: written by registration/eligibility staff,
--     not by patients or payer/employer accounts.
--   - encounters + diagnosis/procedure coding + medical_records/lab_results:
--     clinical documentation, written by providers/coders/admin.
--   - claims + all claim child tables: billing/adjudication, written by
--     billers/coders/admin/insurance (matches InsuranceClaimsCenter.tsx,
--     which performs claim approve/deny and is where medical_biller/coder
--     accounts are routed per roleMapping.ts).
--   - prior_authorizations: the app mounts the same PriorAuthEngine
--     component in both the provider and insurance portals, so both
--     provider and billing/payer roles can create and decide prior auths.
--   - appointments: providers/front-desk/admin book on a patient's behalf;
--     ProviderSearch.tsx also lets a signed-in patient book for themselves
--     — but does so today with NO ownership check (it books whichever
--     patient row happens to be first in the fetched list). This migration
--     closes that: a patient-role account may only insert an appointment
--     for the patients row actually linked to their own auth account.
--   - prescriptions: PrescriptionsView.tsx lets a patient request a refill
--     (an update to `status` only) on their own prescription; only
--     providers/admin can otherwise write a prescription.
--
-- Known, disclosed limitation: patient-scoped checks below resolve through
-- patients.user_id = auth.uid(). No signup/registration flow in this app
-- currently sets that link (there is no self-service linking of an
-- auth.users signup to a patients row yet), so until that trusted linking
-- path is built, a real patient-role account cannot yet satisfy these
-- patient-owned-row checks against the live database. That is a real,
-- necessary gap to close next, not something this migration papers over.

CREATE OR REPLACE FUNCTION public.current_user_patient_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id
  FROM public.patients p
  JOIN public.users u ON u.id = p.user_id
  WHERE p.user_id = auth.uid()
    AND u.is_active = true
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_patient_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_patient_id() TO authenticated;

-- Replace each table's single FOR ALL tenant policy with a SELECT policy
-- (tenant-scoped only, open to every same-org role — matches how the app
-- actually reads today) plus a role-restricted write policy for
-- INSERT/UPDATE/DELETE. A permissive SELECT policy already covers read
-- access for every role, so the FOR ALL write policy's stricter USING
-- clause only narrows INSERT/UPDATE/DELETE, not SELECT.

-- patients / insurance_info: registration + eligibility staff, not patients
-- or payer/employer accounts.
DROP POLICY IF EXISTS patients_tenant ON public.patients;
CREATE POLICY patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY patients_write ON public.patients
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'medical_biller', 'provider'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'medical_biller', 'provider'));

DROP POLICY IF EXISTS insurance_info_tenant ON public.insurance_info;
CREATE POLICY insurance_info_select ON public.insurance_info
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY insurance_info_write ON public.insurance_info
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'medical_biller', 'provider'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'medical_biller', 'provider'));

-- Clinical documentation + coding: providers/coders/admin.
DROP POLICY IF EXISTS encounters_tenant ON public.encounters;
CREATE POLICY encounters_select ON public.encounters
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY encounters_write ON public.encounters
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS diagnosis_codes_tenant ON public.diagnosis_codes;
CREATE POLICY diagnosis_codes_select ON public.diagnosis_codes
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY diagnosis_codes_write ON public.diagnosis_codes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS procedure_codes_tenant ON public.procedure_codes;
CREATE POLICY procedure_codes_select ON public.procedure_codes
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY procedure_codes_write ON public.procedure_codes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS encounter_diagnoses_tenant ON public.encounter_diagnoses;
CREATE POLICY encounter_diagnoses_select ON public.encounter_diagnoses
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY encounter_diagnoses_write ON public.encounter_diagnoses
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS encounter_procedures_tenant ON public.encounter_procedures;
CREATE POLICY encounter_procedures_select ON public.encounter_procedures
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY encounter_procedures_write ON public.encounter_procedures
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS lab_results_tenant ON public.lab_results;
CREATE POLICY lab_results_select ON public.lab_results
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY lab_results_write ON public.lab_results
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

DROP POLICY IF EXISTS medical_records_tenant ON public.medical_records;
CREATE POLICY medical_records_select ON public.medical_records
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY medical_records_write ON public.medical_records
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'coder'));

-- Billing / adjudication: billers/coders/admin/insurance.
DROP POLICY IF EXISTS claims_tenant ON public.claims;
CREATE POLICY claims_select ON public.claims
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claims_write ON public.claims
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

DROP POLICY IF EXISTS claim_lines_tenant ON public.claim_lines;
CREATE POLICY claim_lines_select ON public.claim_lines
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claim_lines_write ON public.claim_lines
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

DROP POLICY IF EXISTS claim_status_events_tenant ON public.claim_status_events;
CREATE POLICY claim_status_events_select ON public.claim_status_events
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claim_status_events_write ON public.claim_status_events
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

DROP POLICY IF EXISTS claim_payments_tenant ON public.claim_payments;
CREATE POLICY claim_payments_select ON public.claim_payments
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claim_payments_write ON public.claim_payments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

DROP POLICY IF EXISTS claim_adjustments_tenant ON public.claim_adjustments;
CREATE POLICY claim_adjustments_select ON public.claim_adjustments
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claim_adjustments_write ON public.claim_adjustments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

DROP POLICY IF EXISTS claim_denials_tenant ON public.claim_denials;
CREATE POLICY claim_denials_select ON public.claim_denials
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY claim_denials_write ON public.claim_denials
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'medical_biller', 'coder', 'insurance'));

-- prior_authorizations: both provider and billing/payer roles create and
-- decide these today (same component mounted in both portals).
DROP POLICY IF EXISTS prior_authorizations_tenant ON public.prior_authorizations;
CREATE POLICY prior_authorizations_select ON public.prior_authorizations
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY prior_authorizations_write ON public.prior_authorizations
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'medical_biller', 'coder', 'insurance'));

-- appointments: staff/providers book freely within their org; a patient may
-- only insert an appointment for the patients row actually linked to their
-- own auth account (the app itself does not check this today — this closes
-- that gap at the database layer).
DROP POLICY IF EXISTS appointments_tenant ON public.appointments;
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY appointments_staff_write ON public.appointments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'provider'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'front_desk', 'staff', 'provider'));
CREATE POLICY appointments_patient_self_book ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );

-- prescriptions: providers/admin write fully; a patient may only update the
-- status of their own prescription (refill requests — matches
-- PrescriptionsView.tsx's actual behavior), restricted to that one column.
DROP POLICY IF EXISTS prescriptions_tenant ON public.prescriptions;
CREATE POLICY prescriptions_select ON public.prescriptions
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY prescriptions_staff_write ON public.prescriptions
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider'));
CREATE POLICY prescriptions_patient_self_update ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() = 'patient' AND patient_id = public.current_user_patient_id())
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() = 'patient' AND patient_id = public.current_user_patient_id());
-- Note: a patient satisfying this policy can update ANY column on their own
-- prescription row, not just `status` (Postgres RLS restricts rows, not
-- columns; true column-level restriction would need a separate low-privilege
-- role, which this project doesn't have). Row-level ownership is enforced;
-- column-level restriction to just the refill-request field is not. Disclosed,
-- not silently assumed safe.
