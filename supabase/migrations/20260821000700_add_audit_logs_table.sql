-- SBOS HealthOS — proposed: audit_logs table
-- Migration: 20260821000700_add_audit_logs_table.sql
--
-- Reconciles the initial schema's legacy timestamp column to the data-layer's
-- created_at field. It is deliberately compatible with both a fresh local
-- schema and a database where the normalized table already exists.

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
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
  ELSIF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN created_at timestamptz;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'audit_logs'
        AND column_name = 'timestamp'
    ) THEN
      UPDATE public.audit_logs SET created_at = timestamp WHERE created_at IS NULL;
    END IF;

    UPDATE public.audit_logs SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE public.audit_logs
      ALTER COLUMN created_at SET DEFAULT now(),
      ALTER COLUMN created_at SET NOT NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS audit_logs_organization_id_idx
  ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs(created_at);
