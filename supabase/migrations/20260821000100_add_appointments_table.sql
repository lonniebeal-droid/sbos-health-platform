-- SBOS HealthOS — proposed: appointments (scheduling) table
-- Migration: 20260821000100_add_appointments_table.sql
--
-- PROPOSED — NOT APPLIED to the live "SBOS HealthOS" project (ref
-- yqlvcmydledbkudstqfo) as of this commit. Written for review; apply only
-- after explicit confirmation.
--
-- Why: the live project has no appointments/scheduling table at all
-- (confirmed via introspection — organizations, users, patients,
-- insurance_info, encounters, diagnosis_codes, procedure_codes,
-- encounter_diagnoses, encounter_procedures, and the claims family are the
-- complete public schema). `encounters` is a completed/in-progress clinical
-- visit record, not a future-dated scheduling primitive, so it isn't an
-- equivalent structure. This is the smallest viable scheduling table: it
-- mirrors the shape this app's booking UI (ProviderSearch.tsx) already
-- writes, except `provider_id` points at users.id directly since there is no
-- separate providers table (see ProviderIdentityRow in
-- src/lib/db/database.types.ts).
--
-- RLS is intentionally left disabled here, matching every other table in
-- this project today (see the RLS-disabled advisory flagged separately) —
-- not fixed as part of this migration.

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  appointment_type text NOT NULL
    CHECK (appointment_type = ANY (ARRAY['telehealth', 'in_person', 'urgent_care', 'specialist']::text[])),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status = ANY (ARRAY['scheduled', 'in_progress', 'completed', 'cancelled']::text[])),
  scheduled_at timestamptz NOT NULL,
  telehealth_room_url text,
  chief_complaint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_organization_id_idx ON public.appointments(organization_id);
CREATE INDEX appointments_patient_id_idx ON public.appointments(patient_id);
CREATE INDEX appointments_provider_id_idx ON public.appointments(provider_id);
CREATE INDEX appointments_scheduled_at_idx ON public.appointments(scheduled_at);
