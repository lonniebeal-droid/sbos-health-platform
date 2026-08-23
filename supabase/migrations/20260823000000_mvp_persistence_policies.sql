-- MVP persistence enablement:
--
-- 1. Clinical notes: providers could generate BIRP notes in the UI but had no
--    place to store them (medical_records.type CHECK excluded notes). Widen the
--    CHECK to admit 'Clinical Note' rows so signed notes persist as part of the
--    patient record (write access stays limited by medical_records_write).
--
-- 2. Patient bill payment: BillPayment could only flip local state because
--    patients had no INSERT path on claim_payments. Add a tightly-scoped
--    self-service policy: a patient may post a payment ONLY against their own
--    claim, ONLY with payment_source = 'patient', and ONLY attributing the
--    payment to themselves (or leaving attribution null). Staff/payer paths
--    remain governed by claim_payments_write.
--
-- 3. Tenant provisioning: TenantManagement had a createOrganization service
--    that no RLS path allowed to succeed. Grant INSERT on organizations to
--    authenticated admins only; everyone else stays read-only.

-- ---------------------------------------------------------------------------
-- 1. Allow 'Clinical Note' medical records
-- ---------------------------------------------------------------------------
ALTER TABLE public.medical_records
  DROP CONSTRAINT medical_records_type_check;
ALTER TABLE public.medical_records
  ADD CONSTRAINT medical_records_type_check
  CHECK ((type = ANY (ARRAY['Lab Result'::text, 'Immunization'::text, 'Visit Summary'::text, 'Imaging'::text, 'Clinical Note'::text])));

-- ---------------------------------------------------------------------------
-- 2. Patient self-service payments on their own claims
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS claim_payments_patient_self_pay ON public.claim_payments;
CREATE POLICY claim_payments_patient_self_pay ON public.claim_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() = 'patient'
    AND payment_source = 'patient'
    AND (posted_by_user_id IS NULL OR posted_by_user_id = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_payments.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND claim.patient_id = public.current_user_patient_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Admin-only tenant provisioning
-- ---------------------------------------------------------------------------
GRANT INSERT ON public.organizations TO authenticated;

DROP POLICY IF EXISTS organizations_admin_insert ON public.organizations;
CREATE POLICY organizations_admin_insert ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');
