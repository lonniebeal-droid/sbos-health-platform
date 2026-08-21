#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

DB_CONTAINER="${DB_CONTAINER:-$(docker ps --format '{{.Names}}' | rg '^supabase_db_' -m 1 || true)}"
if [ -z "$DB_CONTAINER" ]; then
  echo "No running Supabase DB container found. Start it with 'supabase start' first." >&2
  exit 1
fi

TEMP_PATIENT_ID="c0000000-0000-0000-0000-000000000099"
ORG_A_ID="11111111-1111-1111-1111-111111111111"
ORG_B_ID="22222222-2222-2222-2222-222222222222"
PROVIDER_USER_ID="a0000000-0000-0000-0000-000000000001"
PAYER_USER_ID="a0000000-0000-0000-0000-000000000003"
UNTRUSTED_USER_ID="a0000000-0000-0000-0000-000000000099"

db_sql() {
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c "$1"
}

session_sql() {
  local user_id="$1"
  local sql="$2"
  db_sql "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$user_id'; $sql rollback;"
}

assert_eq() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" != "$expected" ]; then
    echo "FAIL: $label" >&2
    echo "  expected: $expected" >&2
    echo "  actual:   $actual" >&2
    exit 1
  fi
  echo "PASS: $label -> $actual"
}

assert_contains() {
  local label="$1"
  local needle="$2"
  local haystack="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "FAIL: $label" >&2
    echo "  expected output to contain: $needle" >&2
    echo "  actual output: $haystack" >&2
    exit 1
  fi
  echo "PASS: $label"
}

cleanup() {
  db_sql "delete from public.patients where id = '$TEMP_PATIENT_ID';" >/dev/null
  db_sql "delete from auth.users where id = '$UNTRUSTED_USER_ID';" >/dev/null
}
trap cleanup EXIT

echo "===================================================="
echo "SBOS HealthOS — RLS verification"
echo "===================================================="
echo "Using DB container: $DB_CONTAINER"

# Seed a second-tenant row so the verifier can prove isolation both ways.
db_sql "
  delete from public.patients where id = '$TEMP_PATIENT_ID';
  delete from auth.users where id = '$UNTRUSTED_USER_ID';
  insert into public.patients (id, organization_id, full_name, date_of_birth)
  values ('$TEMP_PATIENT_ID', '$ORG_B_ID', 'Temp Org B Patient', '1990-01-01');
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', '$UNTRUSTED_USER_ID', 'authenticated', 'authenticated',
    'untrusted-profile@local.test', crypt('Password123!', gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', 'Untrusted Signup', 'role', 'admin', 'organization_id', '$ORG_A_ID'),
    now(), now(), '', '', '', ''
  );
" >/dev/null

untrusted_profile="$(db_sql "select coalesce(organization_id::text, 'unassigned') || '|' || role::text from public.users where id = '$UNTRUSTED_USER_ID';")"
assert_eq "signup metadata cannot assign an org or privileged role" "unassigned|patient" "$untrusted_profile"

provider_mapping="$(session_sql "$PROVIDER_USER_ID" "select public.current_user_org_id()::text || '|' || public.current_user_role()::text;")"
provider_mapping="$(printf '%s\n' "$provider_mapping" | tail -n 2 | head -n 1)"
assert_eq "provider auth maps to org A + provider role" "${ORG_A_ID}|provider" "$provider_mapping"

payer_mapping="$(session_sql "$PAYER_USER_ID" "select public.current_user_org_id()::text || '|' || public.current_user_role()::text;")"
payer_mapping="$(printf '%s\n' "$payer_mapping" | tail -n 2 | head -n 1)"
assert_eq "payer auth maps to org B + insurance role" "${ORG_B_ID}|insurance" "$payer_mapping"

org_count="$(db_sql "begin; set local role anon; select count(*) from public.organizations; rollback;")"
org_count="$(printf '%s\n' "$org_count" | tail -n 2 | head -n 1)"
assert_eq "anon can read the non-PHI organization directory" "3" "$org_count"

provider_patient_count="$(session_sql "$PROVIDER_USER_ID" "select count(*) from public.patients;")"
provider_patient_count="$(printf '%s\n' "$provider_patient_count" | tail -n 2 | head -n 1)"
assert_eq "provider sees only org A patients" "1" "$provider_patient_count"

payer_patient_count="$(session_sql "$PAYER_USER_ID" "select count(*) from public.patients;")"
payer_patient_count="$(printf '%s\n' "$payer_patient_count" | tail -n 2 | head -n 1)"
assert_eq "payer sees only org B patients" "1" "$payer_patient_count"

provider_cross_tenant_read="$(session_sql "$PROVIDER_USER_ID" "select count(*) from public.patients where id = '$TEMP_PATIENT_ID';")"
provider_cross_tenant_read="$(printf '%s\n' "$provider_cross_tenant_read" | tail -n 2 | head -n 1)"
assert_eq "provider cannot read org B patient row" "0" "$provider_cross_tenant_read"

payer_cross_tenant_read="$(session_sql "$PAYER_USER_ID" "select count(*) from public.patients where id = 'c0000000-0000-0000-0000-000000000001';")"
payer_cross_tenant_read="$(printf '%s\n' "$payer_cross_tenant_read" | tail -n 2 | head -n 1)"
assert_eq "payer cannot read org A patient row" "0" "$payer_cross_tenant_read"

untrusted_patient_count="$(session_sql "$UNTRUSTED_USER_ID" "select count(*) from public.patients;")"
untrusted_patient_count="$(printf '%s\n' "$untrusted_patient_count" | tail -n 2 | head -n 1)"
assert_eq "unassigned signup cannot read patient rows" "0" "$untrusted_patient_count"

provider_cross_tenant_update="$(session_sql "$PROVIDER_USER_ID" "update public.patients set address = 'blocked' where id = '$TEMP_PATIENT_ID'; select count(*) from public.patients where id = '$TEMP_PATIENT_ID' and address = 'blocked';")"
provider_cross_tenant_update="$(printf '%s\n' "$provider_cross_tenant_update" | tail -n 2 | head -n 1)"
assert_eq "provider cannot modify org B patient row" "0" "$provider_cross_tenant_update"

same_org_audit_insert="$(session_sql "$PROVIDER_USER_ID" "insert into public.audit_logs (organization_id, actor_id, action, resource_type, resource_id, ip_address) values ('$ORG_A_ID', '$PROVIDER_USER_ID', 'VERIFY_RLS', 'Patient', 'c0000000-0000-0000-0000-000000000001', '127.0.0.1'); select count(*) from public.audit_logs where action = 'VERIFY_RLS';")"
same_org_audit_insert="$(printf '%s\n' "$same_org_audit_insert" | tail -n 2 | head -n 1)"
assert_eq "provider can append an audit log in-org" "1" "$same_org_audit_insert"

set +e
cross_tenant_audit_insert="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PAYER_USER_ID'; insert into public.audit_logs (organization_id, actor_id, action, resource_type, resource_id, ip_address) values ('$ORG_A_ID', '$PAYER_USER_ID', 'CROSS_TENANT', 'Patient', 'c0000000-0000-0000-0000-000000000001', '127.0.0.1'); rollback;" \
    2>&1
)"
cross_tenant_status=$?
provider_audit_update="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PROVIDER_USER_ID'; update public.audit_logs set action = 'MUTATED' where organization_id = '$ORG_A_ID'; rollback;" \
    2>&1
)"
provider_audit_update_status=$?
provider_audit_delete="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PROVIDER_USER_ID'; delete from public.audit_logs where organization_id = '$ORG_A_ID'; rollback;" \
    2>&1
)"
provider_audit_delete_status=$?
provider_profile_escalation="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PROVIDER_USER_ID'; update public.users set role = 'admin', organization_id = '$ORG_B_ID' where id = '$PROVIDER_USER_ID'; rollback;" \
    2>&1
)"
provider_profile_escalation_status=$?
set -e

if [ "$cross_tenant_status" -eq 0 ]; then
  echo "FAIL: payer cross-tenant audit insert unexpectedly succeeded" >&2
  exit 1
fi
assert_contains "payer cross-tenant audit insert is blocked" "violates row-level security policy" "$cross_tenant_audit_insert"

if [ "$provider_audit_update_status" -eq 0 ]; then
  echo "FAIL: provider audit-log update unexpectedly succeeded" >&2
  exit 1
fi
assert_contains "provider cannot rewrite audit logs" "permission denied for table audit_logs" "$provider_audit_update"

if [ "$provider_audit_delete_status" -eq 0 ]; then
  echo "FAIL: provider audit-log delete unexpectedly succeeded" >&2
  exit 1
fi
assert_contains "provider cannot delete audit logs" "permission denied for table audit_logs" "$provider_audit_delete"

if [ "$provider_profile_escalation_status" -eq 0 ]; then
  echo "FAIL: provider profile privilege escalation unexpectedly succeeded" >&2
  exit 1
fi
assert_contains "provider cannot change role or organization" "permission denied for table users" "$provider_profile_escalation"


# --- Per-role write RBAC (20260821182000_per_role_write_rbac.sql) ---
# Tenant isolation alone doesn't stop a patient/payer account from writing
# clinical or billing rows within its own org — these checks prove the
# role-restricted write policies actually gate that.

set +e
payer_writes_patient="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PAYER_USER_ID'; update public.patients set address = 'payer-write' where id = 'c0000000-0000-0000-0000-000000000001'; rollback;" \
    2>&1
)"
payer_writes_patient_status=$?
set -e
if [ "$payer_writes_patient_status" -eq 0 ]; then
  echo "FAIL: insurance-role account unexpectedly updated a patients row" >&2
  exit 1
fi
echo "PASS: insurance role cannot write to patients (role not in patients_write allow-list)"

provider_creates_encounter="$(session_sql "$PROVIDER_USER_ID" "insert into public.encounters (organization_id, patient_id, provider_user_id, encounter_date, encounter_type, status) values ('$ORG_A_ID', 'c0000000-0000-0000-0000-000000000001', '$PROVIDER_USER_ID', current_date, 'office_visit', 'draft'); select count(*) from public.encounters where patient_id = 'c0000000-0000-0000-0000-000000000001';")"
provider_creates_encounter="$(printf '%s\n' "$provider_creates_encounter" | tail -n 2 | head -n 1)"
assert_eq "provider (clinical role) can create an encounter in-org" "2" "$provider_creates_encounter"

set +e
payer_creates_encounter="$(
  docker exec "$DB_CONTAINER" psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \
    "begin; set local role authenticated; set local \"request.jwt.claim.sub\" = '$PAYER_USER_ID'; insert into public.encounters (organization_id, patient_id, provider_user_id, encounter_date, encounter_type, status) values ('$ORG_B_ID', '$TEMP_PATIENT_ID', null, current_date, 'office_visit', 'draft'); rollback;" \
    2>&1
)"
payer_creates_encounter_status=$?
set -e
if [ "$payer_creates_encounter_status" -eq 0 ]; then
  echo "FAIL: insurance-role account unexpectedly created an encounter" >&2
  exit 1
fi
echo "PASS: insurance role cannot write clinical encounters (role not in encounters_write allow-list)"

echo "All RLS checks passed."
