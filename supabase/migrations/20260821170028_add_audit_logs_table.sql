CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  actor_id uuid REFERENCES public.users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_organization_id_idx ON public.audit_logs(organization_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at);
