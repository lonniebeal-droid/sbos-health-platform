CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  ordering_provider_id uuid REFERENCES public.users(id),
  loinc_code text NOT NULL,
  test_name text NOT NULL,
  result_value text NOT NULL,
  reference_range text,
  status text NOT NULL DEFAULT 'pending',
  result_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lab_results_organization_id_idx ON public.lab_results(organization_id);
CREATE INDEX lab_results_patient_id_idx ON public.lab_results(patient_id);
