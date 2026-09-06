CREATE TABLE IF NOT EXISTS public.medical_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor text NOT NULL CHECK (vendor IN ('Epic','athenahealth','Oracle Health / Cerner','eClinicalWorks','Generic FHIR R4')),
  base_url text NOT NULL,
  client_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected','testing','connected','error')),
  fhir_version text,
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, vendor)
);

ALTER TABLE public.medical_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY medical_connectors_admin_select ON public.medical_connectors
FOR SELECT TO authenticated
USING (organization_id = public.current_user_org_id() AND public.current_user_role() = 'admin');

CREATE POLICY medical_connectors_admin_write ON public.medical_connectors
FOR ALL TO authenticated
USING (organization_id = public.current_user_org_id() AND public.current_user_role() = 'admin')
WITH CHECK (organization_id = public.current_user_org_id() AND public.current_user_role() = 'admin');
