-- Move RLS helper functions out of the exposed public schema.
-- This mirrors the migration applied to the hosted SBOS HealthOS project.
-- Policies retain their function dependencies by OID when the functions move schemas.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.current_user_org_id() set schema private;
alter function public.current_user_patient_id() set schema private;
alter function public.current_user_role() set schema private;

grant execute on function private.current_user_org_id() to authenticated, service_role;
grant execute on function private.current_user_patient_id() to authenticated, service_role;
grant execute on function private.current_user_role() to authenticated, service_role;

revoke execute on function private.current_user_org_id() from public;
revoke execute on function private.current_user_patient_id() from public;
revoke execute on function private.current_user_role() from public;
