-- ====================================================================
-- SBOS — extend patients with clinical profile fields the EHR UI needs
-- Migration: 20260725010000_patient_profile_fields.sql
--
-- The patient directory (src/components/provider/PatientManagement.tsx) shows
-- recent vitals, family members, and the primary care physician. Add columns so
-- these can be stored/read faithfully instead of mocked. Name/email/phone live
-- on the linked public.users row (joined at query time).
-- ====================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS recent_vitals JSONB,
  ADD COLUMN IF NOT EXISTS family_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS primary_care_physician TEXT;
