alter table public.patient_auth_enrollments set schema private;
revoke all on private.patient_auth_enrollments from public, anon, authenticated;
grant all on private.patient_auth_enrollments to service_role;

alter function public.create_patient_enrollment(uuid, integer) set schema private;
alter function private.create_patient_enrollment(uuid, integer) rename to create_patient_enrollment_internal;
alter function public.claim_patient_enrollment(text) set schema private;
alter function private.claim_patient_enrollment(text) rename to claim_patient_enrollment_internal;

revoke all on function private.create_patient_enrollment_internal(uuid, integer) from public, anon;
revoke all on function private.claim_patient_enrollment_internal(text) from public, anon;
grant execute on function private.create_patient_enrollment_internal(uuid, integer) to authenticated, service_role;
grant execute on function private.claim_patient_enrollment_internal(text) to authenticated, service_role;

create or replace function public.create_patient_enrollment(
  p_patient_id uuid,
  p_expires_minutes integer default 60
)
returns text
language sql
security invoker
set search_path = public, private
as $$
  select private.create_patient_enrollment_internal(p_patient_id, p_expires_minutes)
$$;

create or replace function public.claim_patient_enrollment(p_token text)
returns uuid
language sql
security invoker
set search_path = public, private
as $$
  select private.claim_patient_enrollment_internal(p_token)
$$;

revoke all on function public.create_patient_enrollment(uuid, integer) from public, anon;
revoke all on function public.claim_patient_enrollment(text) from public, anon;
grant execute on function public.create_patient_enrollment(uuid, integer) to authenticated, service_role;
grant execute on function public.claim_patient_enrollment(text) to authenticated, service_role;
