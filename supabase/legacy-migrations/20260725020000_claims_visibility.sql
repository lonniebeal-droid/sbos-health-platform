-- ====================================================================
-- SBOS — claims visibility (patient/provider/payer) + display fields
-- Migration: 20260725020000_claims_visibility.sql
--
-- The enterprise schema only let the PAYER org see claims
-- (claims_payer_tenant). Claims are inherently multi-party: the patient, the
-- servicing provider's org, and the payer all need appropriate visibility.
-- This adds:
--   * organization_id (servicing/provider org) to claims
--   * plain_english_explanation (shown in the patient claims UI)
--   * SELECT policies so a patient sees their OWN claims and provider/admin staff
--     see their org's claims. The payer policy from the prior migration remains.
-- ====================================================================

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS plain_english_explanation TEXT,
  -- Denormalized display identity carried ON the claim (as in an EDI 837).
  -- Lets the PAYER org see who the claim is for without a cross-org join into
  -- the servicing org's patients/providers (which RLS correctly blocks). This
  -- is minimal-necessary disclosure: names/NPI only, not the full record.
  ADD COLUMN IF NOT EXISTS patient_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_name TEXT,
  ADD COLUMN IF NOT EXISTS provider_npi TEXT;

-- A patient can read only their own claims (ownership, not org-wide).
CREATE POLICY claims_patient_self ON public.claims
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

-- Provider/admin staff read claims for their (servicing) organization.
CREATE POLICY claims_org_staff ON public.claims
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('provider', 'admin')
  );
