-- ====================================================================
-- SBOS — benefits_plans table (member coverage: deductible / OOP / copays)
-- Migration: 20260725040000_benefits_plans.sql
--
-- Backs src/components/patient/BenefitsExplainer.tsx. Same visibility model as
-- medical_records: a patient sees only their own plan; provider/admin staff see
-- their organization's plans.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.benefits_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    plan_id VARCHAR(100) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    network_type VARCHAR(10) NOT NULL CHECK (network_type IN ('PPO', 'HMO', 'EPO')),
    individual_deductible NUMERIC(10, 2) NOT NULL DEFAULT 0,
    deductible_met NUMERIC(10, 2) NOT NULL DEFAULT 0,
    out_of_pocket_max NUMERIC(10, 2) NOT NULL DEFAULT 0,
    out_of_pocket_met NUMERIC(10, 2) NOT NULL DEFAULT 0,
    copays JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benefits_plans_patient ON public.benefits_plans(patient_id);

ALTER TABLE public.benefits_plans ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits_plans TO authenticated;

CREATE POLICY benefits_plans_patient_self ON public.benefits_plans
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

CREATE POLICY benefits_plans_org_staff ON public.benefits_plans
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('provider', 'admin')
  )
  WITH CHECK (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('provider', 'admin')
  );
