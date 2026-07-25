-- ====================================================================
-- SBOS — organization white-label settings + tenant-admin self-service edit
-- Migration: 20260725070000_org_settings.sql
--
-- Restores the white-label / billing / feature-flag fields (originally on the
-- discarded `tenants` table) onto the canonical `organizations` table, and lets
-- a tenant ADMIN edit their OWN organization's settings.
--
-- NOT covered here (genuine blockers requiring infra/credentials only the owner
-- can provide): provisioning NEW tenants and inviting/creating users both need
-- the Supabase service-role key (admin auth API) and/or email/SMTP. Those remain
-- service-role-only and are documented in docs/TODO.md.
-- ====================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(60) DEFAULT 'from-blue-600 to-indigo-600',
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(60) DEFAULT 'Enterprise SaaS',
  ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(12, 2) NOT NULL DEFAULT 35000,
  ADD COLUMN IF NOT EXISTS active_enrollees INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_date DATE,
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS users_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "telehealthEnabled": true, "rcmEdiEnabled": true, "priorAuthAiEnabled": true,
    "behavioralHealthEnabled": true, "employerPortalEnabled": true, "mfaEnforced": true
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A tenant admin may update their OWN organization's settings (not others').
CREATE POLICY organizations_admin_update_own ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.current_user_org_id() AND public.current_user_role() = 'admin')
  WITH CHECK (id = public.current_user_org_id() AND public.current_user_role() = 'admin');

GRANT UPDATE ON public.organizations TO authenticated;
