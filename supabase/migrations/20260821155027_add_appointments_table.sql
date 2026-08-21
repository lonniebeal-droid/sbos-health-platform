CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  provider_id uuid NOT NULL REFERENCES public.users(id),
  appointment_type text NOT NULL
    CHECK (appointment_type = ANY (ARRAY['telehealth', 'in_person', 'urgent_care', 'specialist']::text[])),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status = ANY (ARRAY['scheduled', 'in_progress', 'completed', 'cancelled']::text[])),
  scheduled_at timestamptz NOT NULL,
  telehealth_room_url text,
  chief_complaint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_organization_id_idx ON public.appointments(organization_id);
CREATE INDEX appointments_patient_id_idx ON public.appointments(patient_id);
CREATE INDEX appointments_provider_id_idx ON public.appointments(provider_id);
CREATE INDEX appointments_scheduled_at_idx ON public.appointments(scheduled_at);
