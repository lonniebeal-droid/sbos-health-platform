-- ====================================================================
-- SBOS — employer groups + member roster (self-insured employer portal)
-- Migration: 20260725060000_employer.sql
--
-- Backs src/components/employer/EmployerPortal.tsx. An employer_group belongs to
-- an organization of type 'employer_group'; employer_members are its census.
-- Tenant-isolated: employer staff see only their organization's group + roster.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.employer_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    group_number VARCHAR(100),
    active_enrollees INT NOT NULL DEFAULT 0,
    plan_type VARCHAR(255),
    monthly_premium_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    renewal_date DATE,
    wellness_participation_rate INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_renewal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.employer_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_group_id UUID REFERENCES public.employer_groups(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    full_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255),
    plan VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Enrolled',
    dependents INT NOT NULL DEFAULT 0,
    premium_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employer_groups_org ON public.employer_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_employer_members_group ON public.employer_members(employer_group_id);

ALTER TABLE public.employer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employer_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employer_members TO authenticated;

CREATE POLICY employer_groups_tenant ON public.employer_groups
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY employer_members_tenant ON public.employer_members
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());
