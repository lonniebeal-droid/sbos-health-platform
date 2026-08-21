# DATABASE — SBOS HealthOS

Supabase Postgres. Source of truth: `supabase/migrations/*.sql` and
`src/lib/db/database.types.ts` (hand-written row types mirroring the schema).

## Migrations (applied in order)

| Migration | Adds |
| --------- | ---- |
| `20260724000000_enterprise_schema.sql` | Core schema: 10 tables, 7 enums, base policies |
| `20260725000000_auth_integration_rls.sql` | Auth linkage (`public.users`↔`auth.users`), `handle_new_user` trigger, helper functions, 12 RLS policies |
| `20260725010000_patient_profile_fields.sql` | Additional patient profile columns |
| `20260725020000_claims_visibility.sql` | Claims RLS: patient/provider visibility on top of payer scope |
| `20260725030000_medical_records.sql` | `medical_records` table (+2 indexes, RLS) |
| `20260725040000_benefits_plans.sql` | `benefits_plans` table (+1 index, RLS) |
| `20260725050000_claims_denial_reason.sql` | Structured claim-denial reason field |
| `20260821000000_add_payer_employer_roles.sql` | Payer/employer role compatibility for normalized schemas |
| `20260821000100_add_appointments_table.sql` | Appointment-table compatibility + indexes |
| `20260821000200_add_prior_authorizations_table.sql` | Prior-authorization-table compatibility + indexes |
| `20260821000300_add_prescriptions_table.sql` | Prescription-table compatibility + indexes |
| `20260821000400_add_lab_results_table.sql` | Lab-results-table compatibility + indexes |
| `20260821000500_add_medical_records_table.sql` | Medical-records-table compatibility + indexes |
| `20260821000600_add_benefits_to_insurance_info.sql` | Benefits fields where normalized `insurance_info` exists |
| `20260821000700_add_audit_logs_table.sql` | Normalized `audit_logs.created_at` field + indexes |
| `20260821172346_secure_profile_provisioning_and_audit_schema.sql` | Safe signup profiles and column-level profile update restrictions |

Apply locally with `supabase db reset` (or `supabase db push` against a target).

## Enums

`user_role` (patient, provider, insurance, employer, admin) ·
`org_type` (health_system, payer, employer_group, clinic) ·
`claim_status` (submitted, in_review, adjudicated, approved, denied, paid) ·
`appointment_type` (telehealth, in_person, urgent_care, specialist) ·
`appointment_status` (scheduled, in_progress, completed, cancelled) ·
`rx_status` (active, refill_requested, expired, discontinued) ·
`prior_auth_status` (pending, approved, denied, info_requested)

## Tables (12)

| Table | Purpose | Key relationships |
| ----- | ------- | ----------------- |
| `organizations` | Tenants (health systems, payers, employers, clinics) | parent of users/patients/providers |
| `users` | Profile table keyed to `auth.users(id)`; role + org | → organizations |
| `patients` | Patient demographics, insurance member id, vitals, allergies, conditions | → users, organizations |
| `providers` | Clinician records (NPI, specialty, license, fee) | → users, organizations |
| `appointments` | Visits (type, status, scheduled_at, telehealth URL, chief complaint) | → patients, providers, organizations |
| `claims` | Insurance claims (ICD-10/CPT arrays, amounts, status, AI risk score/flags) | → patients, providers, payer org |
| `prescriptions` | Medications (dosage, frequency, refills, status, pharmacy) | → patients, providers, organizations |
| `prior_authorizations` | Prior-auth requests (service, ICD/CPT, status, AI recommendation) | → patients, providers, organizations |
| `lab_results` | Lab results (LOINC, value, reference range, status) | → patients, ordering provider, organizations |
| `medical_records` | Patient medical records | → patients |
| `benefits_plans` | Employer/payer benefit plans | → organizations |
| `audit_logs` | Audit trail (actor, action, resource, ip, created_at) | → organizations, actor |

Column-level detail lives in `src/lib/db/database.types.ts` (the row interfaces).

## Relationships

See the ER diagram in [ARCHITECTURE](ARCHITECTURE.md#database). All child tables
carry `organization_id` (directly or transitively) for tenant scoping.

## Indexes

- Primary keys and foreign keys create implicit indexes.
- Explicit indexes: `medical_records` (2), `benefits_plans` (1). Other hot-path
  indexes are **not yet defined** — a known optimization gap for larger data
  ([KNOWN_ISSUES](KNOWN_ISSUES.md)).

## Row-Level Security (RLS)

- ~20 policies across migrations, keyed on helper functions:
  - `current_user_org_id()` — the signed-in user's organization.
  - `current_user_role()` — the signed-in user's role.
- Default posture: rows are visible only within the user's organization; claims
  are payer-scoped with an explicit patient/provider visibility exception.
- **Verification note:** RLS parity with client-side gates has not been
  exhaustively verified for every table. `npm run verify:rls` covers seeded
  org isolation, audit-log immutability, and profile-escalation resistance.

## Migrations — future changes

- Add hot-path indexes (claims by payer/status, appointments by provider/date).
- Tables for unimplemented modules (messaging, notifications) when built.
- Consider generated types (`supabase gen types typescript`) to replace the
  hand-written `database.types.ts` and prevent drift.
