# SBOS HealthOS — Next Session Brief

_Resume-here document. Regenerate/refresh at the end of each session._

## Snapshot
- **Branch:** `phase-0-foundations`
- **Handoff docs commit:** `40c7649`. The branch tip is one follow-up commit ahead
  (this hash record). Always `git checkout phase-0-foundations` and `git log -1`
  for the exact tip.
- **Tests:** 33 passing (`npm test`).
- **Build:** passing (`npm run build`); typecheck clean (`npm run lint`).
- **Commits this session:** 15 (+ handoff docs).

---

## Current architecture
- **Frontend:** React 19 + Vite 6 + Tailwind v4 SPA. Role-based portals
  (patient / provider / insurance / employer / admin) under `src/components/`.
- **Auth:** Supabase Auth. `src/lib/authContext.tsx` (AuthProvider/useAuth) +
  `src/components/auth/LoginScreen.tsx`. App gates on auth when Supabase is
  configured; dev-fallback (no login) when it isn't.
- **Data layer (client-side):**
  - `src/lib/supabaseClient.ts` — client + `requireSupabase()`.
  - `src/lib/db/database.types.ts` — DB row/enum types + join view types.
  - `src/lib/db/mappers.ts` — DB row → UI domain mappers.
  - `src/lib/repositories.ts` — per-table typed data access (factory, testable).
  - `src/lib/services/{authService,organizationService}.ts`.
  - `src/lib/hooks/useAsync.ts` — load/error state hook.
- **Backend server (`server.ts`):** Express. Real `/api/ai/*` (Gemini) +
  `/api/health`. All other endpoints are still fake literals (to be removed).
- **DB:** Local Supabase (Postgres) via Colima. Tenant isolation via RLS keyed to
  `current_user_org_id()`.

## Database schema status
Canonical schema applied and verified locally. Tables: `organizations`, `users`
(profile, keyed to `auth.users`), `patients`, `providers`, `appointments`,
`claims`, `prescriptions`, `prior_authorizations`, `lab_results`, `audit_logs`.
RLS enabled on all tenant tables with real per-org policies (org directory is
publicly readable; PHI tables deny anon; claims are payer-scoped).

### Migrations completed
1. `20260724000000_enterprise_schema.sql` — canonical schema, enums, seed orgs.
2. `20260725000000_auth_integration_rls.sql` — auth linkage, drop password_hash,
   uniform `organization_id`, helper fns + new-user trigger, real RLS, grants.
3. `20260725010000_patient_profile_fields.sql` — patient vitals/family/PCP.
- `supabase/seed.sql` — 4 auth users + sample clinical data.

## Components migrated to real data
- `provider/PatientManagement.tsx` (patient directory)
- `patient/PrescriptionsView.tsx` (+ real refill)
- `patient/PatientDashboard.tsx` (appointments section)

All use the repository + `useAsync` pattern with a demo-data fallback and a
Live/Demo indicator.

## Remaining mocked components (~18)
`patient/ClaimsTracker`, `patient/BenefitsExplainer`, `patient/MedicalRecordsView`,
`patient/ProviderSearch`, `patient/TelehealthRoom`, `patient/InsuranceCardModal`,
`patient/BillPayment`, `insurance/InsuranceClaimsCenter`, `insurance/InsuranceHub`,
`employer/EmployerPortal`, `admin/AdminPortal`, `admin/TenantManagement`,
`provider/ClinicalDocumentation`,
`provider/AIClinicalAssistant`, `rcm/ElectronicPrescribing`, `rcm/PriorAuthEngine`,
`rcm/EligibilityVerifier`, `rcm/LabIntegrationHub`. (Patient self-profile fields
in `PatientDashboard` header still use `samplePatient`.)

## Outstanding technical debt
See `TECH_DEBT.md` (authoritative). Highlights: fake `server.ts` endpoints to
remove; RBAC not enforced in RLS (per-role writes) or on routes; no input
validation / rate limiting / security headers; two package managers
(`bun.lock` + `package-lock.json`); schema thinner than some UI types
(patient_messages, benefits_plans, medical_records, provider profile fields);
claims provider-side RLS missing; OpenAPI spec incomplete.

## Immediate next task
Migrate **claims** to real data (see `docs/TODO.md` P0). Add
`claims.listDetailed()` (join patient + provider names), `mapClaim()`, wire
`ClaimsTracker` (patient) and `InsuranceClaimsCenter` (payer). Claims RLS is
payer-scoped — add a patient/provider-side claims policy in a new migration so
the patient view returns rows. Verify with `supabase db reset` + signed-in
queries for both a payer and a patient, then `npm test` + `npm run build`.

## Long-term roadmap
Phase 2 finish (all core EHR entities on real data) → Phase 3 clinical
(progress/BIRP notes, treatment plans, assessments, AI documentation on real
records) → Phase 4 revenue cycle (eligibility, claims, billing w/ real Stripe,
employer portal) → Phase 5 Jessie AI / voice → Phase 6 production hardening
(audit logging, encryption, security review, HIPAA controls, hosted deploy).
Full detail in `AUDIT_REAL.md` §6.

## Known blockers
- **Local dev:** none.
- **Browser SPA smoke-test:** blocked by a local auth-gateway bound to
  `127.0.0.1` that intercepts loopback ports (env issue; app boots on 0.0.0.0).
- **Beyond local (owner-only):** hosted Supabase project + signed **BAA** before
  real PHI; production secrets / domain / DNS; payment + clearinghouse creds.

## Environment requirements
- Node (tested on v26), npm.
- Docker runtime: **Colima** (`colima start`) + Docker CLI.
- **Supabase CLI**.
- `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (local values in `.env`; template in `.env.example`),
  and optionally `GEMINI_API_KEY` / `GEMINI_MODEL`.

## Commands to resume development
```bash
cd /Users/lonniebgroupllc/sbos-health-platform
git checkout phase-0-foundations && git pull

colima start                 # if the VM is not running
supabase start               # start local Postgres/Auth/etc.
supabase db reset            # (re)apply migrations + seed

npm install
npm run lint                 # tsc --noEmit
npm test                     # vitest (33 passing)
npm run build                # vite + esbuild
npm run dev                  # tsx server.ts (port 3000; set PORT to override)
```
Local test accounts (password `Password123!`): `provider@bayarea.test`,
`patient@bayarea.test`, `payer@sbospremier.test`, `admin@bayarea.test`.
Supabase Studio: http://127.0.0.1:54323

## Files most likely edited next (claims migration)
- `src/lib/db/database.types.ts` (add `ClaimWithNames`)
- `src/lib/db/mappers.ts` (add `mapClaim`)
- `src/lib/repositories.ts` (add `claims.listDetailed`)
- `supabase/migrations/2026072502xxxx_claims_visibility_rls.sql` (new)
- `src/components/patient/ClaimsTracker.tsx`
- `src/components/insurance/InsuranceClaimsCenter.tsx`
- `src/tests/mappers.test.ts` (add mapClaim tests)
