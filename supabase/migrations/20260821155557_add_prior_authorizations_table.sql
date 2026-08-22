CREATE TABLE public.prior_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  requested_service text NOT NULL,
  icd10_code text NOT NULL,
  cpt_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending', 'approved', 'denied', 'info_requested']::text[])),
  clinical_notes text,
  ai_recommendation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX prior_authorizations_organization_id_idx ON public.prior_authorizations(organization_id);
CREATE INDEX prior_authorizations_patient_id_idx ON public.prior_authorizations(patient_id);
