create policy patient_auth_enrollments_no_direct_access
on private.patient_auth_enrollments
for all
to public
using (false)
with check (false);
