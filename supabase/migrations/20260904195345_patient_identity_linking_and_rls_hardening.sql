create unique index if not exists patients_user_id_unique_not_null
  on public.patients(user_id)
  where user_id is not null;

create table if not exists public.patient_auth_enrollments (
  id uuid primary key default extensions.gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.patient_auth_enrollments enable row level security;
revoke all on public.patient_auth_enrollments from anon, authenticated;
grant all on public.patient_auth_enrollments to service_role;

create or replace function private.can_access_patient(resource_org_id uuid, resource_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    resource_org_id = private.current_user_org_id()
    and (
      private.current_user_role() = any (
        array['admin','provider','medical_biller','coder','front_desk','staff','insurance']::text[]
      )
      or (
        private.current_user_role() = 'patient'
        and resource_patient_id = private.current_user_patient_id()
      )
    )
$$;

revoke all on function private.can_access_patient(uuid, uuid) from public;
grant execute on function private.can_access_patient(uuid, uuid) to authenticated, service_role;

create or replace function public.create_patient_enrollment(
  p_patient_id uuid,
  p_expires_minutes integer default 60
)
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
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

  delete from public.patient_auth_enrollments
  where patient_id = v_patient.id
    and used_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.patient_auth_enrollments(
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
$$;

revoke all on function public.create_patient_enrollment(uuid, integer) from public;
grant execute on function public.create_patient_enrollment(uuid, integer) to authenticated, service_role;

create or replace function public.claim_patient_enrollment(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_hash text;
  v_enrollment public.patient_auth_enrollments%rowtype;
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
  from public.patient_auth_enrollments
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

  update public.patient_auth_enrollments
  set used_at = now()
  where id = v_enrollment.id;

  return v_enrollment.patient_id;
end;
$$;

revoke all on function public.claim_patient_enrollment(text) from public;
grant execute on function public.claim_patient_enrollment(text) to authenticated, service_role;

drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients
for select to authenticated
using (private.can_access_patient(organization_id, id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments','claims','encounters','insurance_info','lab_results',
    'medical_records','prescriptions','prior_authorizations'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (private.can_access_patient(organization_id, patient_id))',
      t, t
    );
  end loop;
end $$;

drop policy if exists encounter_diagnoses_select on public.encounter_diagnoses;
create policy encounter_diagnoses_select on public.encounter_diagnoses
for select to authenticated
using (
  organization_id = private.current_user_org_id()
  and exists (
    select 1 from public.encounters e
    where e.id = encounter_id
      and private.can_access_patient(e.organization_id, e.patient_id)
  )
);

drop policy if exists encounter_procedures_select on public.encounter_procedures;
create policy encounter_procedures_select on public.encounter_procedures
for select to authenticated
using (
  organization_id = private.current_user_org_id()
  and exists (
    select 1 from public.encounters e
    where e.id = encounter_id
      and private.can_access_patient(e.organization_id, e.patient_id)
  )
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'claim_adjustments','claim_denials','claim_lines','claim_payments','claim_status_events'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated using (organization_id = private.current_user_org_id() and exists (select 1 from public.claims c where c.id = claim_id and private.can_access_patient(c.organization_id, c.patient_id)))',
      t, t
    );
  end loop;
end $$;

drop policy if exists users_select on public.users;
create policy users_select on public.users
for select to authenticated
using (
  id = auth.uid()
  or (
    organization_id = private.current_user_org_id()
    and private.current_user_role() = any(
      array['admin','provider','medical_biller','coder','front_desk','staff','insurance','employer']::text[]
    )
  )
);

revoke update on table public.users from authenticated;
grant update(full_name) on table public.users to authenticated;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
for select to authenticated
using (
  organization_id = private.current_user_org_id()
  and private.current_user_role() = 'admin'
);
