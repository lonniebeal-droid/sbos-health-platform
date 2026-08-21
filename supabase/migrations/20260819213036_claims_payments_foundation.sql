-- Reconstruction of this project's real fifth hosted migration
-- (claims_payments_foundation, applied 2026-08-19). See
-- 20260819203850_reconcile_core_schema.sql for the reconstruction method and
-- disclosure — this file is not literal recovered SQL, it is rebuilt from
-- direct live introspection and split by table grouping to match the real
-- ledger's boundary. This is the last of the five foundational migrations
-- reconstructed here; everything after this point in the migrations folder
-- was captured as real files at the time it was actually applied.

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
