-- Baseline reconstruction of this project's actual foundational schema.
--
-- Why this file exists: the live "SBOS HealthOS" Supabase project (ref
-- yqlvcmydledbkudstqfo) was originally built via five migrations —
-- reconcile_core_schema, insurance_info, encounters_and_coding,
-- claims_foundation, claims_payments_foundation (applied 2026-08-19) — that
-- were run directly against the hosted project and never committed as files
-- in this repo. Meanwhile this repo's migrations/ folder contained a
-- different, unrelated lineage (20260724000000_enterprise_schema.sql,
-- 20260725000000_auth_integration_rls.sql, and 4 more 20260725* files) that
-- was NEVER applied to the live project and describes a schema this project
-- does not have (a `providers` table, a `user_role` enum, `payer_organization_id`
-- on claims, `phone`/`password_hash` on users). That mismatch caused a real,
-- diagnosed production bug earlier in this project's history (see
-- 20260821000800_secure_profile_provisioning_and_rls.sql's commit message).
--
-- This file replaces that incompatible lineage with a reconstruction of the
-- real foundational schema, captured via direct introspection of the live
-- database (columns, constraints, indexes — verified column-by-column, not
-- guessed). It is written with IF NOT EXISTS/idempotent guards throughout so
-- it is a safe no-op against the actual live project (every object here
-- already exists there) and correctly builds the real schema from scratch on
-- a new environment (local dev, CI, a fresh Supabase project).
--
-- Known intentional gap: users.organization_id is created NOT NULL here,
-- matching the real original schema. It is made nullable by a later
-- migration (20260821181000_allow_unassigned_users_nullable_org.sql) — kept
-- as a separate step rather than folded in here, to preserve the real
-- sequence of what happened and why.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'provider', 'medical_biller', 'coder', 'front_desk', 'staff', 'patient', 'insurance', 'employer')),
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_organization ON public.patients(organization_id);

CREATE TABLE IF NOT EXISTS public.insurance_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  payer_name TEXT NOT NULL,
  plan_name TEXT,
  member_id TEXT NOT NULL,
  group_number TEXT,
  policy_holder_name TEXT,
  relationship_to_patient TEXT NOT NULL DEFAULT 'self' CHECK (relationship_to_patient IN ('self', 'spouse', 'child', 'other')),
  coverage_start_date DATE,
  coverage_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_insurance_info_organization ON public.insurance_info(organization_id);
CREATE INDEX IF NOT EXISTS idx_insurance_info_patient ON public.insurance_info(patient_id);

CREATE TABLE IF NOT EXISTS public.diagnosis_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  code_system TEXT NOT NULL DEFAULT 'ICD-10',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_organization ON public.diagnosis_codes(organization_id);

CREATE TABLE IF NOT EXISTS public.procedure_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  code_system TEXT NOT NULL DEFAULT 'CPT',
  default_charge_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);
CREATE INDEX IF NOT EXISTS idx_procedure_codes_organization ON public.procedure_codes(organization_id);

CREATE TABLE IF NOT EXISTS public.encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  encounter_date DATE NOT NULL,
  encounter_type TEXT NOT NULL CHECK (encounter_type IN ('office_visit', 'telehealth', 'follow_up', 'initial_intake', 'urgent_care', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'signed', 'cancelled')),
  chief_complaint TEXT,
  notes_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_encounters_organization ON public.encounters(organization_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON public.encounters(patient_id);

CREATE TABLE IF NOT EXISTS public.encounter_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  diagnosis_code_id UUID NOT NULL REFERENCES public.diagnosis_codes(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, diagnosis_code_id)
);
CREATE INDEX IF NOT EXISTS idx_encounter_diagnoses_encounter ON public.encounter_diagnoses(encounter_id);

CREATE TABLE IF NOT EXISTS public.encounter_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE CASCADE,
  procedure_code_id UUID NOT NULL REFERENCES public.procedure_codes(id) ON DELETE RESTRICT,
  units INTEGER NOT NULL DEFAULT 1,
  charge_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_encounter_procedures_encounter ON public.encounter_procedures(encounter_id);

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES public.encounters(id) ON DELETE RESTRICT,
  insurance_info_id UUID NOT NULL REFERENCES public.insurance_info(id) ON DELETE RESTRICT,
  claim_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'submitted', 'in_review', 'paid', 'denied', 'void')),
  total_charge_cents INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, claim_number)
);
CREATE INDEX IF NOT EXISTS idx_claims_organization ON public.claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON public.claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_encounter ON public.claims(encounter_id);

CREATE TABLE IF NOT EXISTS public.claim_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  encounter_procedure_id UUID NOT NULL REFERENCES public.encounter_procedures(id) ON DELETE RESTRICT,
  procedure_code TEXT NOT NULL,
  procedure_description TEXT NOT NULL,
  units INTEGER NOT NULL,
  charge_cents INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON public.claim_lines(claim_id);

CREATE TABLE IF NOT EXISTS public.claim_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_status_events_claim ON public.claim_status_events(claim_id);

CREATE TABLE IF NOT EXISTS public.claim_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  claim_line_id UUID REFERENCES public.claim_lines(id) ON DELETE SET NULL,
  payment_source TEXT NOT NULL CHECK (payment_source IN ('payer', 'patient', 'other')),
  payment_method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reference_number TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_payments_claim ON public.claim_payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_payments_organization ON public.claim_payments(organization_id);

CREATE TABLE IF NOT EXISTS public.claim_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  claim_line_id UUID REFERENCES public.claim_lines(id) ON DELETE SET NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('contractual', 'write_off', 'correction', 'refund', 'other')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  reason TEXT,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_claim ON public.claim_adjustments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_organization ON public.claim_adjustments(organization_id);

CREATE TABLE IF NOT EXISTS public.claim_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  claim_line_id UUID REFERENCES public.claim_lines(id) ON DELETE SET NULL,
  denial_code TEXT,
  denial_reason TEXT NOT NULL,
  denied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_denials_claim ON public.claim_denials(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_denials_organization ON public.claim_denials(organization_id);
