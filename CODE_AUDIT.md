# SBOS Health Platform — Code Audit

**Last verified:** 2026-07-24 (direct source inspection + `tsc --noEmit`).
**Maintenance:** Living document. Keep the mock inventory (§3) current — it is the
checklist for the mock→real migration.

---

## 1. Stack (as actually installed — `package.json`)

- **Frontend:** React **19**, Vite 6, TypeScript ~5.8, Tailwind CSS v4, `lucide-react`,
  `motion`. (Note: prior docs said "React 18" — the installed version is 19.)
- **Backend:** Express 4, run in dev via `tsx server.ts` (Vite mounted as middleware).
  `@google/genai` (used), `graphql` (installed, **not used** — the GraphQL endpoint is
  hand-rolled), `@supabase/supabase-js` (installed, **never imported**), `dotenv`.
- **Build:** `vite build` + `esbuild` bundle of `server.ts` → `dist/server.cjs`.
- **Origin:** This is a Google AI Studio "applet" export (`package.json` name is
  `react-example`, version `0.0.0`; `.env.example` references AI Studio secret injection).

## 2. Structure

```
server.ts                      one ~500-line Express file, all endpoints mocked
src/
  App.tsx                      role/tenant chosen via useState + dropdowns (no auth)
  types.ts                     thorough domain types (good)
  lib/permissions.ts           real RBAC matrix (not enforced anywhere)
  lib/organizationContext.tsx  React context with its OWN sample orgs
  data/mockData.ts (401 loc)   sample patients/claims/rx/etc.
  data/mockTenants.ts (169)    sample tenants
  components/{patient,provider,insurance,employer,admin,rcm,common}/  24 components
  tests/                       ad-hoc, not runnable via a test runner (see §5)
supabase/migrations/           TWO conflicting schemas (see §4)
terraform/                     GCP Cloud SQL + Cloud Run IaC (never applied)
```

Code quality of the front end is good: typed, organized by role, no `tsc` errors.

## 3. Mock / Fake Inventory (the migration checklist)

**Backend — every non-AI endpoint returns hardcoded literals** (`server.ts`):
`/api/auth/login`, `/api/auth/me`, `/api/tenants`, `/api/appointments`,
`/api/appointments/book`, `/api/messages`, `/api/messages/send`,
`/api/telehealth/rooms`, `/api/telehealth/signaling`, `/api/billing/checkout-session`,
`/api/billing/webhook`, `/api/notifications/sms`, `/api/notifications/email`,
`/api/storage/upload`, `/api/audit/logs`, `/api/audit/record`,
`/api/analytics/dashboard`, `/api/graphql`.
Only `/api/ai/*` (chat, clinical-notes, fraud-analysis) does real work.

**Frontend — 21 components import mock objects directly** from `data/mockData.ts` /
`data/mockTenants.ts` (e.g. `PatientDashboard`, `ClaimsTracker`, `ClinicalDocumentation`,
`TenantManagement`, `Header`, all of `rcm/`, etc.). **7 components call `fetch()`**
(`AIAssistantWidget`, `AIClinicalAssistant`, `ClinicalDocumentation`, `BenefitsExplainer`,
`InsuranceClaimsCenter`, `PriorAuthEngine`, `EmployerPortal`) — but only against the mock
or AI endpoints.

**Four different, inconsistent sources of "organization/tenant" data:**
1. `server.ts` `/api/tenants` (SuccessBrand / Bay Area / Apex),
2. `data/mockTenants.ts`,
3. `lib/organizationContext.tsx` `sampleOrganizations` (org_001…),
4. SQL seed rows in the enterprise migration.
These do not agree. Consolidation needed once a real data source exists.

## 4. Database Schema Conflict (must resolve)

Two migrations define **incompatible** designs:

- `20260724_init_sbos_schema.sql`: tables `tenants`, `profiles`, `appointments`,
  `patient_messages`, `claims`, `audit_logs`.
- `20260724000000_enterprise_schema.sql`: tables `organizations`, `users`, `patients`,
  `providers`, `appointments`, `claims`, `prescriptions`, `prior_authorizations`,
  `lab_results`, `audit_logs`, plus enums and seed data.

Applied together they create two overlapping table sets. The enterprise schema is the
more complete/normalized of the two and is the better canonical base — but its RLS is
broken (`OR TRUE`) and incomplete (4 of 12 tables). **Action:** choose one canonical
schema, delete/merge the other, fix RLS.

## 5. Tests

- `src/tests/permissions.test.ts` — real assertions against `hasPermission()` (good),
  but exposed as a plain exported function, not run by any runner.
- `src/tests/api.test.ts` — `console.log`s "PASSED" for 7 subsystems **unconditionally**;
  it tests nothing.
- No test runner, no `test` script in `package.json`, no coverage tooling.
  **Real automated coverage ≈ 0%** (one unit-testable function). *(Being addressed:
  a real Vitest runner is the first implementation task after this audit.)*

## 6. CI / Build / Deploy

- `.github/workflows/` contains **two** workflow files. One references
  `uses: actions/node-清新@v3` — a corrupted action name that will fail the job.
  Neither workflow runs tests.
- `scripts/deploy.sh` step 3 `echo`s "Migrations applied" but applies nothing, and
  references only the (non-canonical) init migration.
- `Dockerfile` / `docker-compose.yml` are reasonable but unvalidated.
- `terraform/` targets **GCP Cloud SQL**, which contradicts the "Supabase" direction
  elsewhere. Pick one.

## 7. Verified-Good Items

- `tsc --noEmit` passes (0 errors).
- `src/types.ts` and `src/lib/permissions.ts` are clean and reusable.
- The component layer is a solid foundation to build real data flows onto.
