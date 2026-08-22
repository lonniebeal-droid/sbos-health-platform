-- This is a forward-only hardening migration. The historical ledger migrations
-- remain byte-for-byte recovery artifacts; new controls belong here.

-- RLS evaluates after table privileges. No API role may delete clinical or
-- billing records until an explicit, reviewed retention workflow exists.
REVOKE DELETE ON TABLE
  public.patients,
  public.insurance_info,
  public.diagnosis_codes,
  public.procedure_codes,
  public.encounters,
  public.encounter_diagnoses,
  public.encounter_procedures,
  public.claims,
  public.claim_lines,
  public.claim_status_events,
  public.claim_payments,
  public.claim_adjustments,
  public.claim_denials,
  public.appointments,
  public.prior_authorizations,
  public.prescriptions,
  public.lab_results,
  public.medical_records
FROM authenticated;

-- A patient may read only records tied to their patient profile. The helper
-- keeps staff behavior unchanged while making every patient-facing policy
-- use the same ownership predicate.
CREATE OR REPLACE FUNCTION public.can_read_patient_record(record_patient_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.current_user_role() <> 'patient'
      OR record_patient_id = public.current_user_patient_id()
$$;

REVOKE EXECUTE ON FUNCTION public.can_read_patient_record(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_patient_record(UUID) TO authenticated;

DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      public.current_user_role() = 'patient'
      AND role = 'provider'
      AND organization_id = public.current_user_org_id()
    )
    OR (
      public.current_user_role() <> 'patient'
      AND organization_id = public.current_user_org_id()
    )
  );

DROP POLICY IF EXISTS patients_select ON public.patients;
CREATE POLICY patients_select ON public.patients
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(id)
  );

DROP POLICY IF EXISTS insurance_info_select ON public.insurance_info;
CREATE POLICY insurance_info_select ON public.insurance_info
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS encounters_select ON public.encounters;
CREATE POLICY encounters_select ON public.encounters
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS appointments_select ON public.appointments;
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS prior_authorizations_select ON public.prior_authorizations;
CREATE POLICY prior_authorizations_select ON public.prior_authorizations
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS prescriptions_select ON public.prescriptions;
CREATE POLICY prescriptions_select ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS lab_results_select ON public.lab_results;
CREATE POLICY lab_results_select ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS medical_records_select ON public.medical_records;
CREATE POLICY medical_records_select ON public.medical_records
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS claims_select ON public.claims;
CREATE POLICY claims_select ON public.claims
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.can_read_patient_record(patient_id)
  );

DROP POLICY IF EXISTS encounter_diagnoses_select ON public.encounter_diagnoses;
CREATE POLICY encounter_diagnoses_select ON public.encounter_diagnoses
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.encounters encounter
      WHERE encounter.id = encounter_diagnoses.encounter_id
        AND encounter.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(encounter.patient_id)
    )
  );

DROP POLICY IF EXISTS encounter_procedures_select ON public.encounter_procedures;
CREATE POLICY encounter_procedures_select ON public.encounter_procedures
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.encounters encounter
      WHERE encounter.id = encounter_procedures.encounter_id
        AND encounter.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(encounter.patient_id)
    )
  );

DROP POLICY IF EXISTS claim_lines_select ON public.claim_lines;
CREATE POLICY claim_lines_select ON public.claim_lines
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_lines.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(claim.patient_id)
    )
  );

DROP POLICY IF EXISTS claim_status_events_select ON public.claim_status_events;
CREATE POLICY claim_status_events_select ON public.claim_status_events
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_status_events.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(claim.patient_id)
    )
  );

DROP POLICY IF EXISTS claim_payments_select ON public.claim_payments;
CREATE POLICY claim_payments_select ON public.claim_payments
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_payments.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(claim.patient_id)
    )
  );

DROP POLICY IF EXISTS claim_adjustments_select ON public.claim_adjustments;
CREATE POLICY claim_adjustments_select ON public.claim_adjustments
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_adjustments.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(claim.patient_id)
    )
  );

DROP POLICY IF EXISTS claim_denials_select ON public.claim_denials;
CREATE POLICY claim_denials_select ON public.claim_denials
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1
      FROM public.claims claim
      WHERE claim.id = claim_denials.claim_id
        AND claim.organization_id = public.current_user_org_id()
        AND public.can_read_patient_record(claim.patient_id)
    )
  );

DROP POLICY IF EXISTS diagnosis_codes_select ON public.diagnosis_codes;
CREATE POLICY diagnosis_codes_select ON public.diagnosis_codes
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() <> 'patient'
  );

DROP POLICY IF EXISTS procedure_codes_select ON public.procedure_codes;
CREATE POLICY procedure_codes_select ON public.procedure_codes
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() <> 'patient'
  );

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() <> 'patient'
  );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_org_id()
    AND actor_id = auth.uid()
    AND public.current_user_role() IN (
      'admin', 'provider', 'medical_biller', 'coder', 'front_desk', 'staff',
      'insurance', 'employer'
    )
  );

-- Patients can request appointments through the dedicated insert policy, but
-- cannot alter provider-authored prescriptions.
DROP POLICY IF EXISTS prescriptions_patient_self_update ON public.prescriptions;

-- Every tenant-scoped reference must point at a parent in the same
-- organization. The original single-column foreign keys remain for backwards
-- compatibility; these composite foreign keys prevent cross-tenant joins.
-- Existing linked databases are checked before validation so operators get a
-- precise remediation error instead of a partial migration or opaque FK error.
DO $$
DECLARE
  relationship RECORD;
  has_cross_tenant_reference BOOLEAN;
BEGIN
  FOR relationship IN
    SELECT *
    FROM (VALUES
      ('patients', 'user_id', 'users'),
      ('insurance_info', 'patient_id', 'patients'),
      ('encounters', 'patient_id', 'patients'),
      ('encounters', 'provider_user_id', 'users'),
      ('encounter_diagnoses', 'encounter_id', 'encounters'),
      ('encounter_diagnoses', 'diagnosis_code_id', 'diagnosis_codes'),
      ('encounter_procedures', 'encounter_id', 'encounters'),
      ('encounter_procedures', 'procedure_code_id', 'procedure_codes'),
      ('claims', 'patient_id', 'patients'),
      ('claims', 'encounter_id', 'encounters'),
      ('claims', 'insurance_info_id', 'insurance_info'),
      ('claims', 'created_by_user_id', 'users'),
      ('claim_lines', 'claim_id', 'claims'),
      ('claim_lines', 'encounter_procedure_id', 'encounter_procedures'),
      ('claim_status_events', 'claim_id', 'claims'),
      ('claim_status_events', 'changed_by_user_id', 'users'),
      ('claim_payments', 'claim_id', 'claims'),
      ('claim_payments', 'claim_line_id', 'claim_lines'),
      ('claim_payments', 'posted_by_user_id', 'users'),
      ('claim_adjustments', 'claim_id', 'claims'),
      ('claim_adjustments', 'claim_line_id', 'claim_lines'),
      ('claim_adjustments', 'created_by_user_id', 'users'),
      ('claim_denials', 'claim_id', 'claims'),
      ('claim_denials', 'claim_line_id', 'claim_lines'),
      ('claim_denials', 'created_by_user_id', 'users'),
      ('appointments', 'patient_id', 'patients'),
      ('appointments', 'provider_id', 'users'),
      ('prior_authorizations', 'patient_id', 'patients'),
      ('prior_authorizations', 'provider_id', 'users'),
      ('prescriptions', 'patient_id', 'patients'),
      ('prescriptions', 'provider_id', 'users'),
      ('lab_results', 'patient_id', 'patients'),
      ('lab_results', 'ordering_provider_id', 'users'),
      ('medical_records', 'patient_id', 'patients'),
      ('audit_logs', 'actor_id', 'users')
    ) AS relationships(child_table, foreign_key_column, parent_table)
  LOOP
    EXECUTE format(
      'SELECT EXISTS (
        SELECT 1
        FROM public.%1$I child
        JOIN public.%2$I parent ON parent.id = child.%3$I
        WHERE child.%3$I IS NOT NULL
          AND child.organization_id IS NOT NULL
          AND parent.organization_id IS DISTINCT FROM child.organization_id
      )',
      relationship.child_table,
      relationship.parent_table,
      relationship.foreign_key_column
    ) INTO has_cross_tenant_reference;

    IF has_cross_tenant_reference THEN
      RAISE EXCEPTION
        'Resolve cross-tenant references in public.% before applying migration: %.organization_id must match public.%.organization_id',
        relationship.child_table,
        relationship.foreign_key_column,
        relationship.parent_table;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_id_organization_key
  ON public.users (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS patients_id_organization_key
  ON public.patients (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS insurance_info_id_organization_key
  ON public.insurance_info (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS encounters_id_organization_key
  ON public.encounters (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS diagnosis_codes_id_organization_key
  ON public.diagnosis_codes (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS procedure_codes_id_organization_key
  ON public.procedure_codes (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS encounter_procedures_id_organization_key
  ON public.encounter_procedures (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS claims_id_organization_key
  ON public.claims (id, organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS claim_lines_id_organization_key
  ON public.claim_lines (id, organization_id);

ALTER TABLE public.patients
  ADD CONSTRAINT patients_user_organization_fkey
  FOREIGN KEY (user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.insurance_info
  ADD CONSTRAINT insurance_info_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.encounters
  ADD CONSTRAINT encounters_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.encounters
  ADD CONSTRAINT encounters_provider_organization_fkey
  FOREIGN KEY (provider_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.encounter_diagnoses
  ADD CONSTRAINT encounter_diagnoses_encounter_organization_fkey
  FOREIGN KEY (encounter_id, organization_id)
  REFERENCES public.encounters (id, organization_id);
ALTER TABLE public.encounter_diagnoses
  ADD CONSTRAINT encounter_diagnoses_code_organization_fkey
  FOREIGN KEY (diagnosis_code_id, organization_id)
  REFERENCES public.diagnosis_codes (id, organization_id);
ALTER TABLE public.encounter_procedures
  ADD CONSTRAINT encounter_procedures_encounter_organization_fkey
  FOREIGN KEY (encounter_id, organization_id)
  REFERENCES public.encounters (id, organization_id);
ALTER TABLE public.encounter_procedures
  ADD CONSTRAINT encounter_procedures_code_organization_fkey
  FOREIGN KEY (procedure_code_id, organization_id)
  REFERENCES public.procedure_codes (id, organization_id);
ALTER TABLE public.claims
  ADD CONSTRAINT claims_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.claims
  ADD CONSTRAINT claims_encounter_organization_fkey
  FOREIGN KEY (encounter_id, organization_id)
  REFERENCES public.encounters (id, organization_id);
ALTER TABLE public.claims
  ADD CONSTRAINT claims_insurance_organization_fkey
  FOREIGN KEY (insurance_info_id, organization_id)
  REFERENCES public.insurance_info (id, organization_id);
ALTER TABLE public.claims
  ADD CONSTRAINT claims_creator_organization_fkey
  FOREIGN KEY (created_by_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.claim_lines
  ADD CONSTRAINT claim_lines_claim_organization_fkey
  FOREIGN KEY (claim_id, organization_id)
  REFERENCES public.claims (id, organization_id);
ALTER TABLE public.claim_lines
  ADD CONSTRAINT claim_lines_procedure_organization_fkey
  FOREIGN KEY (encounter_procedure_id, organization_id)
  REFERENCES public.encounter_procedures (id, organization_id);
ALTER TABLE public.claim_status_events
  ADD CONSTRAINT claim_status_events_claim_organization_fkey
  FOREIGN KEY (claim_id, organization_id)
  REFERENCES public.claims (id, organization_id);
ALTER TABLE public.claim_status_events
  ADD CONSTRAINT claim_status_events_user_organization_fkey
  FOREIGN KEY (changed_by_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.claim_payments
  ADD CONSTRAINT claim_payments_claim_organization_fkey
  FOREIGN KEY (claim_id, organization_id)
  REFERENCES public.claims (id, organization_id);
ALTER TABLE public.claim_payments
  ADD CONSTRAINT claim_payments_line_organization_fkey
  FOREIGN KEY (claim_line_id, organization_id)
  REFERENCES public.claim_lines (id, organization_id);
ALTER TABLE public.claim_payments
  ADD CONSTRAINT claim_payments_user_organization_fkey
  FOREIGN KEY (posted_by_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.claim_adjustments
  ADD CONSTRAINT claim_adjustments_claim_organization_fkey
  FOREIGN KEY (claim_id, organization_id)
  REFERENCES public.claims (id, organization_id);
ALTER TABLE public.claim_adjustments
  ADD CONSTRAINT claim_adjustments_line_organization_fkey
  FOREIGN KEY (claim_line_id, organization_id)
  REFERENCES public.claim_lines (id, organization_id);
ALTER TABLE public.claim_adjustments
  ADD CONSTRAINT claim_adjustments_user_organization_fkey
  FOREIGN KEY (created_by_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.claim_denials
  ADD CONSTRAINT claim_denials_claim_organization_fkey
  FOREIGN KEY (claim_id, organization_id)
  REFERENCES public.claims (id, organization_id);
ALTER TABLE public.claim_denials
  ADD CONSTRAINT claim_denials_line_organization_fkey
  FOREIGN KEY (claim_line_id, organization_id)
  REFERENCES public.claim_lines (id, organization_id);
ALTER TABLE public.claim_denials
  ADD CONSTRAINT claim_denials_user_organization_fkey
  FOREIGN KEY (created_by_user_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_provider_organization_fkey
  FOREIGN KEY (provider_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.prior_authorizations
  ADD CONSTRAINT prior_authorizations_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.prior_authorizations
  ADD CONSTRAINT prior_authorizations_provider_organization_fkey
  FOREIGN KEY (provider_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_provider_organization_fkey
  FOREIGN KEY (provider_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_provider_organization_fkey
  FOREIGN KEY (ordering_provider_id, organization_id)
  REFERENCES public.users (id, organization_id);
ALTER TABLE public.medical_records
  ADD CONSTRAINT medical_records_patient_organization_fkey
  FOREIGN KEY (patient_id, organization_id)
  REFERENCES public.patients (id, organization_id);
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_organization_fkey
  FOREIGN KEY (actor_id, organization_id)
  REFERENCES public.users (id, organization_id);
