-- Fix: patient enrollment functions still referenced public.patient_auth_enrollments
-- after migration 20260904191212_move_rls_helpers_out_of_exposed_schema moved the table
-- to the "private" schema. Every create/claim enrollment call failed at runtime with
-- "relation \"public.patient_auth_enrollments\" does not exist".
--
-- Only the schema-qualified table references changed (public. -> private.).
-- ALL logic, guards and protections are unchanged:
--   - authentication required
--   - role gate (admin/front_desk/staff/provider only for create)
--   - token length + sha256 hash checks, single-use tokens, expiry window
--   - duplicate-link protection (auth user already linked / patient already linked)
--   - enrollment email must match authenticated email
--   - atomic SELECT ... FOR UPDATE claim
--   - patient role assignment (no self-escalation path)
--
-- Applied to the hosted SBOS HealthOS Supabase project 2026-09-23 as
-- migration fix_patient_enrollment_stale_schema_refs and verified:
--   1. Post-fix definitions contain zero public.patient_auth_enrollments references.
--   2. Runtime smoke test reaches the function's own "authentication required" guard
--      instead of "relation does not exist".
--   3. Security advisor re-run: no regressions.
-- Evidence: https://github.com/lonniebeal-droid/sbos-health-platform/issues/16#issuecomment-5804488408

CREATE OR REPLACE FUNCTION private.create_patient_enrollment_internal(p_patient_id uuid, p_expires_minutes integer DEFAULT 60)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions'
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_actor_org uuid := private.current_user_org_id();
  v_actor_role text := private.current_user_role();
  v_patient public.patients%rowtype;
  v_token text;
  v_hash text;
begin
  if v_actor_id is null or v_actor_org is null then
    raise exception 'authentication required';
  end if;

  if v_actor_role is null or v_actor_role <> all(array['admin','front_desk','staff','provider']::text[]) then
    raise exception 'insufficient privileges';
  end if;

  if p_expires_minutes < 10 or p_expires_minutes > 1440 then
    raise exception 'expiry must be between 10 and 1440 minutes';
  end if;

  select * into v_patient
  from public.patients
  where id = p_patient_id
    and organization_id = v_actor_org
  for update;

  if not found then
    raise exception 'patient not found';
  end if;

  if v_patient.user_id is not null then
    raise exception 'patient already linked';
  end if;

  if nullif(btrim(v_patient.email), '') is null then
    raise exception 'patient email required before enrollment';
  end if;

  delete from private.patient_auth_enrollments
  where patient_id = v_patient.id
    and used_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into private.patient_auth_enrollments(
    patient_id,
    organization_id,
    email,
    token_hash,
    expires_at,
    created_by
  ) values (
    v_patient.id,
    v_patient.organization_id,
    lower(btrim(v_patient.email)),
    v_hash,
    now() + make_interval(mins => p_expires_minutes),
    v_actor_id
  );

  return v_token;
end;
$function$;

CREATE OR REPLACE FUNCTION private.claim_patient_enrollment_internal(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_hash text;
  v_enrollment private.patient_auth_enrollments%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if length(coalesce(p_token, '')) < 32 then
    raise exception 'invalid enrollment token';
  end if;

  if v_email = '' then
    raise exception 'authenticated email required';
  end if;

  if exists(select 1 from public.patients where user_id = v_user_id) then
    raise exception 'auth user already linked to a patient';
  end if;

  if not exists(
    select 1 from public.users
    where id = v_user_id
      and is_active = true
      and role = 'patient'
  ) then
    raise exception 'active patient profile required';
  end if;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_enrollment
  from private.patient_auth_enrollments
  where token_hash = v_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invalid or expired enrollment token';
  end if;

  if lower(v_enrollment.email) <> v_email then
    raise exception 'enrollment email does not match authenticated user';
  end if;

  update public.patients
  set user_id = v_user_id,
      updated_at = now()
  where id = v_enrollment.patient_id
    and organization_id = v_enrollment.organization_id
    and user_id is null;

  if not found then
    raise exception 'patient is no longer available for linking';
  end if;

  update public.users
  set organization_id = v_enrollment.organization_id,
      role = 'patient',
      is_active = true,
      updated_at = now()
  where id = v_user_id;

  update private.patient_auth_enrollments
  set used_at = now()
  where id = v_enrollment.id;

  return v_enrollment.patient_id;
end;
$function$;
