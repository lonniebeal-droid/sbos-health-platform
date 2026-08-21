-- SBOS HealthOS — proposed: prescriptions table
-- Migration: 20260821000300_add_prescriptions_table.sql
--
-- PROPOSED — NOT APPLIED. Written for review; apply only after explicit
-- confirmation. No live equivalent exists (confirmed via introspection).

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  refills_remaining integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active', 'refill_requested', 'expired', 'discontinued']::text[])),
  pharmacy_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescriptions_organization_id_idx ON public.prescriptions(organization_id);
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON public.prescriptions(patient_id);
