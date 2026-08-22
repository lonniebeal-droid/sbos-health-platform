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

DROP POLICY IF EXISTS prior_authorizations_tenant ON public.prior_authorizations;
CREATE POLICY prior_authorizations_select ON public.prior_authorizations
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());
CREATE POLICY prior_authorizations_write ON public.prior_authorizations
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'medical_biller', 'coder', 'insurance'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('admin', 'provider', 'medical_biller', 'coder', 'insurance'));

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
