# DATABASE — SBOS HealthOS

Supabase Postgres. Source of truth: the live "SBOS HealthOS" project (ref
`yqlvcmydledbkudstqfo`) — verify current shape via Supabase MCP
(`list_tables`, `execute_sql` introspection) or `supabase db diff` against a
linked project, not by reading migration files in isolation. Application-side
row types live in `src/lib/db/database.types.ts` and are hand-written to
mirror the live schema (not generated) — they can drift; re-verify against
the live project before trusting them for anything security-relevant.

## Migrations (applied in order)

Every filename below is the exact version + name Supabase's own migration
ledger records for the live "SBOS HealthOS" project (confirmed via Supabase
MCP `list_migrations`) — this folder can be diffed 1:1 against that ledger.
The first five were applied directly to the hosted project without ever
being committed as files in this repo; their SQL text here is a
reconstruction from live introspection (not literal recovered original SQL —
Supabase's ledger exposes version + name, not historical SQL bodies), split
along the same five-migration boundary the ledger records rather than
merged into one file. An earlier, unrelated migration lineage
(`20260724000000_enterprise_schema.sql`, `20260725000000_auth_integration_rls.sql`,
and four more `20260725*` files) was removed from this repo entirely — it
was never applied to the live project, does not correspond to any entry in
the ledger, and described a schema this project does not have (a `providers`
table, a `user_role` enum, `payer_organization_id` on claims,
`phone`/`password_hash` on `users`). A later orphan file with the same
problem (`20260821172346_secure_profile_provisioning_and_audit_schema.sql`,
also never applied) was likewise removed rather than renamed, since it has
no corresponding ledger entry to rename it to.

| Migration | Adds |
| --------- | ---- |
| `20260819203850_reconcile_core_schema.sql` | Core identity/tenant tables: organizations, users, patients |
| `20260819204458_insurance_info.sql` | `insurance_info` table |
| `20260819205146_encounters_and_coding.sql` | diagnosis_codes, procedure_codes, encounters, encounter_diagnoses, encounter_procedures |
| `20260819210149_claims_foundation.sql` | claims, claim_lines, claim_status_events |
| `20260819213036_claims_payments_foundation.sql` | claim_payments, claim_adjustments, claim_denials |
| `20260821155018_add_payer_employer_roles.sql` | `insurance`/`employer` added to the `users.role` check constraint |
| `20260821155027_add_appointments_table.sql` | `appointments` table + indexes |
| `20260821155557_add_prior_authorizations_table.sql` | `prior_authorizations` table + indexes |
| `20260821162323_add_prescriptions_table.sql` | `prescriptions` table + indexes |
| `20260821163232_add_lab_results_table.sql` | `lab_results` table + indexes |
| `20260821164211_add_medical_records_table.sql` | `medical_records` table + indexes |
| `20260821164927_add_benefits_to_insurance_info.sql` | Benefits fields (deductibles, OOP max, copays) added to `insurance_info` |
| `20260821170028_add_audit_logs_table.sql` | `audit_logs` table + indexes |
| `20260821174350_secure_profile_provisioning_and_rls.sql` | `current_user_org_id()`/`current_user_role()`, `handle_new_user()` signup trigger, RLS enabled on all tables with tenant-isolation policies |
| `20260821174424_lock_down_rls_helper_function_execute.sql` | Revokes `anon`/`authenticated` EXECUTE on the RLS helper functions beyond what `REVOKE ... FROM PUBLIC` actually strips |
| `20260821181853_require_active_profile_for_rls.sql` | `current_user_org_id()`/`current_user_role()` now require `is_active = true` — a deactivated account can no longer resolve a tenant/role even with a live session |
| `20260821183307_allow_unassigned_users_nullable_org.sql` | Fixes `users.organization_id` from `NOT NULL` to nullable — required for `handle_new_user()`'s "new signups are unassigned" design to actually work |
| `20260821183723_per_role_write_rbac.sql` | Per-role write policies (see RLS section below) |

Apply locally with `supabase db reset` (or `supabase db push` against a
target) — this now actually reconstructs the live schema and matches the
hosted ledger version-for-version; it did not before the five
`20260819*` foundational migrations above were added.

## Roles

`users.role` is plain `text` with a CHECK constraint, not an enum:
`admin`, `provider`, `medical_biller`, `coder`, `front_desk`, `staff`,
`patient`, `insurance`, `employer`. Status/type fields on other tables
(`claims.status`, `appointments.status`, etc.) are likewise `text` + CHECK,
not Postgres enum types — verify exact allowed values via
`pg_get_constraintdef` before assuming a value name.

## Tables (21)

| Table | Purpose | Key relationships |
| ----- | ------- | ----------------- |
| `organizations` | Tenants | root of every other table's `organization_id` |
| `users` | Profile table keyed to `auth.users(id)`; role + org (org nullable until an admin assigns one) | → organizations |
| `patients` | Patient demographics (name, DOB, gender, contact, address) | → organizations, users (optional, self-service link) |
| `insurance_info` | Payer/plan/member info + benefits (deductibles, OOP max, copays) | → organizations, patients |
| `diagnosis_codes` | Org-scoped ICD-10 code catalog | → organizations |
| `procedure_codes` | Org-scoped CPT code catalog | → organizations |
| `encounters` | Clinical visits | → organizations, patients, users (provider) |
| `encounter_diagnoses` | Diagnosis codes attached to an encounter | → encounters, diagnosis_codes |
| `encounter_procedures` | Procedure codes attached to an encounter (with charge) | → encounters, procedure_codes |
| `claims` | Insurance claims, built from a coded encounter | → organizations, patients, encounters, insurance_info |
| `claim_lines` | Billed lines on a claim | → claims, encounter_procedures |
| `claim_status_events` | Claim status change history | → claims |
| `claim_payments` | Payments posted against a claim | → claims, claim_lines |
| `claim_adjustments` | Contractual/write-off/correction adjustments | → claims, claim_lines |
| `claim_denials` | Denial records | → claims, claim_lines |
| `appointments` | Scheduled visits (type, status, telehealth URL) | → organizations, patients, users (provider) |
| `prior_authorizations` | Prior-auth requests | → organizations, patients, users (provider) |
| `prescriptions` | Medications | → organizations, patients, users (provider) |
| `lab_results` | Lab results (LOINC, value, reference range) | → organizations, patients, users (ordering provider) |
| `medical_records` | Patient medical records | → organizations, patients |
| `audit_logs` | Internal application action log (not a certified compliance record) | → organizations, users (actor, both nullable for system events) |

There is no `providers` table — a provider is a `users` row with
`role = 'provider'`. There is no `benefits_plans` table — benefits fields
live directly on `insurance_info`.

Column-level detail lives in `src/lib/db/database.types.ts`, but re-verify
against the live project for anything security-relevant.

## Relationships

Every table except `organizations` carries `organization_id` directly
(`users.organization_id` is nullable; everything else is `NOT NULL`).

## Indexes

- Primary keys, foreign keys, and unique constraints create implicit indexes.
- Explicit `idx_*` btree indexes exist on the tenant-scoping `organization_id`
  column of every child table, plus the main lookup FKs (`patient_id`,
  `claim_id`, `encounter_id`). Verify current indexes with
  `select * from pg_indexes where schemaname='public'` before assuming one
  exists for a specific query pattern.

## Row-Level Security (RLS)

RLS is enabled on all 21 tables (it was disabled everywhere until
`20260821174350_secure_profile_provisioning_and_rls.sql`). Two layers:

1. **Tenant isolation** — every table's SELECT policy scopes rows to
   `organization_id = current_user_org_id()`. `organizations` itself is
   readable by `anon` too (a non-PHI tenant directory, needed pre-login).
2. **Per-role write RBAC** (`20260821183723_per_role_write_rbac.sql`) —
   INSERT/UPDATE/DELETE on top of tenant isolation are further restricted by
   `users.role`, grounded in the app's actual write paths (see that
   migration's header comment for the reasoning per table), not invented
   from scratch:
   - `patients`/`insurance_info`: `admin`, `front_desk`, `staff`,
     `medical_biller`, `provider`.
   - `encounters`/`diagnosis_codes`/`procedure_codes`/
     `encounter_diagnoses`/`encounter_procedures`/`medical_records`/
     `lab_results`: `admin`, `provider`, `coder`.
   - `claims` and all claim child tables: `admin`, `medical_biller`,
     `coder`, `insurance`.
   - `prior_authorizations`: `admin`, `provider`, `medical_biller`,
     `coder`, `insurance`.
   - `appointments`: staff roles book freely in-org; a `patient` may only
     insert an appointment for the `patients` row linked to their own
     account (`current_user_patient_id()`).
   - `prescriptions`: `admin`/`provider` write fully; a `patient` may
     UPDATE only their own prescription row (row-level only — Postgres RLS
     can't restrict to a single column without a separate low-privilege
     role, so a patient can technically update any column on their own row,
     not just `status`; see the migration for the full disclosure).
   - `users`: a user may UPDATE only their own row, and only the
     `full_name` column (`GRANT UPDATE (full_name)`) — role/org changes are
     not self-service.
   - `audit_logs`: insert + select only for any same-org authenticated
     user (no update/delete policy exists, so both are denied outright —
     append-only).
- Helper functions `current_user_org_id()`, `current_user_role()`,
  `current_user_patient_id()` are `STABLE SECURITY DEFINER`, granted
  `EXECUTE` to `authenticated` only (not `anon`, not `PUBLIC`), and all
  additionally require `users.is_active = true` to resolve anything — a
  deactivated account fails every RLS check even with a live session.
- **Known, disclosed limitations** (not silently assumed solved):
  - The patient-ownership checks (`appointments`, `prescriptions`) resolve
    through `patients.user_id = auth.uid()`. No self-service signup/
    registration flow in this app currently sets that link, so a real
    patient-role account cannot yet satisfy these checks against the live
    database until that trusted linking path is built.
  - Every migration file's DDL was individually validated (BEGIN/ROLLBACK
    against the live project via Supabase MCP — zero syntax or FK-reference
    errors across all 18 files) but that only proves the SQL is well-formed,
    not that `supabase db reset` + `seed.sql` + `npm run verify:rls`
    actually succeed end-to-end from an empty database. That full run was
    attempted and blocked in this environment: Docker registry pulls are
    blocked by network policy, Supabase branching needs a paid plan, and a
    new free project is blocked by this account's 2-project limit. Until one
    of those is run somewhere unblocked, `verify-rls.sh`'s assertions are
    reviewed-correct but not empirically confirmed passing.
  - This does not establish HIPAA compliance or production PHI readiness on
    its own.

## Migrations — future changes

- Build the trusted admin path for assigning `organization_id`/`role` to a
  newly-signed-up user (currently every signup lands `patient`/unassigned
  with no way to promote them through the app).
- Build the patient self-service registration flow that links a `patients`
  row to `auth.uid()` via `patients.user_id`, so the patient-ownership RLS
  checks above can actually be satisfied by a real signed-in patient.
- Consider generated types (`supabase gen types typescript`) to replace the
  hand-written `database.types.ts` and prevent drift.
