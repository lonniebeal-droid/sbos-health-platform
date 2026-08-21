-- Reconstruction of this project's real fourth hosted migration
-- (claims_foundation, applied 2026-08-19). See
-- 20260819203850_reconcile_core_schema.sql for the reconstruction method and
-- disclosure — this file is not literal recovered SQL, it is rebuilt from
-- direct live introspection and split by table grouping to match the real
-- ledger's boundary.

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
