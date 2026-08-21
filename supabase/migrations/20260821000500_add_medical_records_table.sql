-- SBOS HealthOS — proposed: medical_records table
-- Migration: 20260821000500_add_medical_records_table.sql
--
-- PROPOSED — NOT APPLIED. Written for review; apply only after explicit
-- confirmation. No live equivalent exists (confirmed via introspection).
-- This is a patient-facing record index (chart summary/imaging/immunization
-- entries), distinct from the clinical `encounters` table.

CREATE TABLE public.medical_records (
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

CREATE INDEX medical_records_organization_id_idx ON public.medical_records(organization_id);
CREATE INDEX medical_records_patient_id_idx ON public.medical_records(patient_id);
