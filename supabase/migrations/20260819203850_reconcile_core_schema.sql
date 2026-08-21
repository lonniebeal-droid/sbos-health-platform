-- Reconstruction of this project's real first hosted migration
-- (reconcile_core_schema, applied 2026-08-19 to the live "SBOS HealthOS"
-- Supabase project, ref yqlvcmydledbkudstqfo). The literal original SQL text
-- is not recoverable from this environment (Supabase's migration ledger
-- exposes version + name, not historical SQL bodies) — this file is
-- reconstructed from direct live introspection (pg_attribute, pg_constraint,
-- pg_indexes, information_schema.columns — verified column-by-column, not
-- guessed) and split to match the real ledger's five-migration boundary by
-- table grouping (core identity/tenant tables here; the remaining domain
-- tables in the four migrations that follow this one). It is written with
-- IF NOT EXISTS/idempotent guards so it is a safe no-op against the live
-- project (every object here already exists there) and correctly builds
-- this piece of the schema from scratch on a new environment.
--
-- Known intentional gap: users.organization_id is created NOT NULL here,
-- matching the real original schema. It is made nullable by
-- 20260821183307_allow_unassigned_users_nullable_org.sql — kept as a
-- separate migration to preserve the real sequence of what happened and why
-- (that fix was a bug found and applied much later, not part of this
-- original migration).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'provider', 'medical_biller', 'coder', 'front_desk', 'staff', 'patient', 'insurance', 'employer')),
  full_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_organization ON public.users(organization_id);

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patients_organization ON public.patients(organization_id);
