-- Reconstruction of this project's real third hosted migration
-- (encounters_and_coding, applied 2026-08-19). See
-- 20260819203850_reconcile_core_schema.sql for the reconstruction method and
-- disclosure — this file is not literal recovered SQL, it is rebuilt from
-- direct live introspection and split by table grouping to match the real
-- ledger's boundary.

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
