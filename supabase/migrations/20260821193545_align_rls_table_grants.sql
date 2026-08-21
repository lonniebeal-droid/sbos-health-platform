-- Reproduce the table privileges required for RLS to evaluate on a fresh
-- database. RLS controls rows only after the authenticated role has a table
-- privilege; the hosted project had those grants outside recorded migrations.
-- Keep DDL and TRUNCATE unavailable to API roles.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- The organization directory is intentionally readable before sign-in.
GRANT SELECT ON public.organizations TO anon;

-- Every signed-in role may read rows permitted by the table RLS policies.
GRANT SELECT ON TABLE
  public.organizations,
  public.users,
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
  public.medical_records,
  public.audit_logs
TO authenticated;

-- Table-level DML is deliberately broad enough for the role-specific RLS
-- policies to decide each row operation. organizations remain read-only,
-- users retain the prior full_name-only self-update grant, and audit logs
-- remain append-only at both the privilege and policy layers.
GRANT INSERT, UPDATE, DELETE ON TABLE
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
TO authenticated;

GRANT UPDATE (full_name) ON public.users TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
