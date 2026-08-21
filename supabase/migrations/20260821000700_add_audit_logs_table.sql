-- SBOS HealthOS — proposed: audit_logs table
-- Migration: 20260821000700_add_audit_logs_table.sql
--
-- PROPOSED — NOT APPLIED. Written for review; apply only after explicit
-- confirmation. No live equivalent exists (confirmed via introspection).
-- HIPAA-relevant access logging — organization_id/actor_id are nullable to
-- allow system-generated events with no acting user, matching the old flat
-- schema's shape and mapAuditLog()'s existing SYSTEM_EVENT handling.

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
