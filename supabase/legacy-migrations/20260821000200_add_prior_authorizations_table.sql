-- SBOS HealthOS — proposed: prior_authorizations table
-- Migration: 20260821000200_add_prior_authorizations_table.sql
--
-- PROPOSED — NOT APPLIED. Written for review; apply only after explicit
-- confirmation. No live equivalent exists (confirmed via introspection).
--
-- A prior-auth request is typically filed BEFORE the encounter it covers
-- happens, so it can't hang off encounter_diagnoses/encounter_procedures the
-- way claims do — icd10_code/cpt_code stay as plain text here, same as the
-- old flat schema, rather than forcing a premature FK to an encounter that
-- doesn't exist yet.

CREATE TABLE IF NOT EXISTS public.prior_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  requested_service text NOT NULL,
  icd10_code text NOT NULL,
  cpt_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending', 'approved', 'denied', 'info_requested']::text[])),
  clinical_notes text,
  ai_recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prior_authorizations_organization_id_idx ON public.prior_authorizations(organization_id);
CREATE INDEX IF NOT EXISTS prior_authorizations_patient_id_idx ON public.prior_authorizations(patient_id);
