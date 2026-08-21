-- Reconstruction of this project's real second hosted migration
-- (insurance_info, applied 2026-08-19). See
-- 20260819203850_reconcile_core_schema.sql for the reconstruction method and
-- disclosure — this file is not literal recovered SQL, it is rebuilt from
-- direct live introspection and split by table grouping to match the real
-- ledger's boundary.

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
