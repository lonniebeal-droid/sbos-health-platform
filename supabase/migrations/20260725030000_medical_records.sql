-- ====================================================================
-- SBOS — medical_records table (EHR lab reports / immunizations / summaries)
-- Migration: 20260725030000_medical_records.sql
--
-- Backs src/components/patient/MedicalRecordsView.tsx. Same visibility model as
-- claims: a patient sees only their own records; provider/admin staff see their
-- organization's records.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    record_date DATE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Lab Result', 'Immunization', 'Visit Summary', 'Imaging')),
    title VARCHAR(255) NOT NULL,
    doctor VARCHAR(255),
    facility VARCHAR(255),
    summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'abnormal', 'pending')),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_org ON public.medical_records(organization_id);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;

-- Patient reads only their own records.
CREATE POLICY medical_records_patient_self ON public.medical_records
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

-- Provider/admin staff read + manage their organization's records.
CREATE POLICY medical_records_org_staff ON public.medical_records
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('provider', 'admin')
  )
  WITH CHECK (
    organization_id = public.current_user_org_id()
    AND public.current_user_role() IN ('provider', 'admin')
  );
