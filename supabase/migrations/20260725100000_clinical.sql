-- ====================================================================
-- SBOS — clinical platform: notes (BIRP/SOAP/progress), treatment plans, assessments
-- Migration: 20260725100000_clinical.sql
--
-- Behavioral-health clinical documentation. Org staff (provider/admin) manage
-- their organization's records; a patient may read their own.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers(id),
    organization_id UUID REFERENCES public.organizations(id),
    note_type VARCHAR(20) NOT NULL DEFAULT 'BIRP' CHECK (note_type IN ('BIRP', 'SOAP', 'PROGRESS')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    suggested_icd JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_cpt JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers(id),
    organization_id UUID REFERENCES public.organizations(id),
    title VARCHAR(255) NOT NULL,
    diagnosis VARCHAR(255),
    goals JSONB NOT NULL DEFAULT '[]'::jsonb,
    interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.providers(id),
    organization_id UUID REFERENCES public.organizations(id),
    instrument VARCHAR(50) NOT NULL,
    score INT,
    severity VARCHAR(50),
    responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON public.clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessments_patient ON public.assessments(patient_id);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;

-- Shared visibility model: patient reads own; provider/admin staff manage org's.
CREATE POLICY clinical_notes_patient_self ON public.clinical_notes
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY clinical_notes_org_staff ON public.clinical_notes
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'));

CREATE POLICY treatment_plans_patient_self ON public.treatment_plans
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY treatment_plans_org_staff ON public.treatment_plans
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'));

CREATE POLICY assessments_patient_self ON public.assessments
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));
CREATE POLICY assessments_org_staff ON public.assessments
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'))
  WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() IN ('provider', 'admin'));
