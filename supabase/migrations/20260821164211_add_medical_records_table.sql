-- SBOS HealthOS — medical_records compatibility reconciliation
-- Migration: 20260821000500_add_medical_records_table.sql
--
-- The original repository migration already creates this table. This migration
-- must therefore reconcile the missing normalized-schema column instead of
-- silently skipping its schema via CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  record_date date NOT NULL,
  type text NOT NULL
    CHECK (type = ANY (ARRAY['Lab Result', 'Immunization', 'Visit Summary', 'Imaging']::text[])),
  title text NOT NULL,
  doctor text,
  facility text,
  summary text,
  status text NOT NULL DEFAULT 'normal'
    CHECK (status = ANY (ARRAY['normal', 'abnormal', 'pending']::text[])),
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Existing local installations have every record field above except
-- updated_at. Backfill before enforcing the data-layer contract.
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.medical_records
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.medical_records
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS medical_records_organization_id_idx ON public.medical_records(organization_id);
CREATE INDEX IF NOT EXISTS medical_records_patient_id_idx ON public.medical_records(patient_id);
