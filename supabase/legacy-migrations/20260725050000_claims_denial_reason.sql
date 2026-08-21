-- SBOS — claims denial reason tracking
-- Migration: 20260725050000_claims_denial_reason.sql
--
-- The claims table already tracks payment via `approved_amount`, but has no
-- structured way to record why a claim was denied — payer staff had no place
-- to persist a denial code/reason, only the bare `status = 'denied'` enum
-- value. Adds two nullable columns; no RLS changes needed, since the
-- existing row-level policies (claims_payer_tenant, claims_org_staff,
-- claims_patient_self) are not column-scoped and already grant UPDATE to the
-- same actors who set status.

ALTER TABLE public.claims
  ADD COLUMN denial_code VARCHAR(30),
  ADD COLUMN denial_reason TEXT,
  ADD COLUMN adjudication_method VARCHAR(10) CHECK (adjudication_method IN ('automated', 'manual'));

COMMENT ON COLUMN public.claims.denial_code IS
  'Structured denial reason code (e.g. MISSING_DOCS, NOT_COVERED). Null unless status = denied.';
COMMENT ON COLUMN public.claims.denial_reason IS
  'Free-text denial reason/notes shown to the member and provider. Null unless status = denied.';
COMMENT ON COLUMN public.claims.adjudication_method IS
  'Whether a paid/denied claim was decided by the rules engine (automated) or a payer staff action (manual). Null while still open.';
