# SBOS Health Platform — Technical Debt Register

**Last verified:** 2026-07-24.
**Maintenance:** Living document. Add items as they arise; mark them resolved (with a
date) only after the fix is verified in code. Do not remove resolved items — strike
them through so history is preserved.

Priority: **P0** = blocks correctness/security · **P1** = blocks real features ·
**P2** = quality/maintainability.

---

## P0 — Correctness & Security

| # | Item | Detail |
|---|---|---|
| 1 | **`server.ts` endpoints still mocked** | Every non-AI endpoint returns hardcoded literals. The real data layer (`src/lib/repositories.ts`, `services/`) now exists client-side; the Express endpoints still need to use it or be removed in favor of direct Supabase access. |
| 2 | **Fake `/api/auth/login` still present** | Real Supabase Auth login is wired (login screen + auth context; role from profile). The fake `/api/auth/login` / `/api/auth/me` in `server.ts` are now unused and should be removed. MFA not yet configured. |
| 5 | **Fabricated-claim risk** | Prior reports claimed controls that don't exist. Reports rewritten 2026-07-24; keep them honest going forward. |
| 6 | **No input validation / rate limiting / security headers** | All `server.ts` endpoints trust `req.body`; no helmet/CORS/limits. |

## P1 — Blocks Real Features

| # | Item | Detail |
|---|---|---|
| 8 | **RBAC never enforced** | `permissions.ts` is correct and unit-tested but not yet called by any route or UI guard. Also not yet enforced in RLS (tenant isolation is; per-role writes are not). |
| 9 | **Components still import mocks directly** | ~18 of 21 components still import `data/mock*`. Migrated so far: PatientManagement, PrescriptionsView, and PatientDashboard appointments. Continue one domain at a time via the repository/`useAsync` pattern. |
| 10 | **Inconsistent org/tenant sources** | `server.ts /api/tenants`, `mockTenants.ts`, and SQL seeds still disagree. `organizationContext.tsx` now loads real orgs from Supabase; consolidate the rest. |
| 22 | **Schema thinner than UI domain types** | No columns/tables for: patient vitals, family members, primaryCarePhysician; provider rating/bio/avatar/affiliation; patient_messages, benefits_plans, medical_records. Add these before those views can use real data. |
| 23 | **Claims RLS is payer-only** | `claims_payer_tenant` isolates by `payer_organization_id`; provider-side visibility not yet modeled. |
| 24 | **No seed for auth users** | `supabase/seed.sql` absent; no test users to sign in with locally. Add a seed that creates auth users + profiles. |
| 11 | **`deploy.sh` doesn't migrate** | Step 3 only echoes success; wire a real migration step. |
| 12 | **Terraform vs Supabase mismatch** | IaC provisions GCP Cloud SQL while docs say Supabase. Decide the target. |
| 13 | **GraphQL is fake** | `graphql` dep unused; `/api/graphql` ignores the query. Either implement or remove. |
| 14 | **OpenAPI spec incomplete** | `docs/openapi.json` (87 lines) doesn't cover all endpoints. |

## P2 — Quality & Maintainability

| # | Item | Detail |
|---|---|---|
| 17 | **Two package managers** | Both `bun.lock` and `package-lock.json` present. Pick one. |
| 18 | **Project metadata** | `package.json` name `react-example`, version `0.0.0`. Rename/version it. |
| 19 | **Monolithic `server.ts`** | ~500 lines; split into routers/services as real logic lands. |
| 20 | **No error boundaries / logging / env validation** | Add React error boundaries, a logging strategy, and env-var validation. |
| 21 | **`APP_URL` unused** | Declared in `.env.example`, referenced nowhere. |

---

## Resolved

- 2026-07-25 — **Conflicting DB schemas** (was item 3). Enterprise schema chosen
  canonical; redundant `20260724_init_sbos_schema.sql` removed.
- 2026-07-25 — **Broken RLS** (was item 4). New migration
  `20260725000000_auth_integration_rls.sql` removes the `OR TRUE` policies, links
  `public.users` to `auth.users`, adds a uniform `organization_id` to the tables
  that lacked one, and enables real tenant-isolation RLS on all tenant tables.
  Validated on `supabase db reset`: anon reads the org directory, PHI tables deny
  unauthenticated access.
- 2026-07-25 — **`@supabase/supabase-js` unused** (was item 7). Now wired via
  `src/lib/supabaseClient.ts` + a repository/service layer, consumed by
  `organizationContext.tsx`.
- 2026-07-25 — **`server.ts` ignored `process.env.PORT`** despite docker-compose
  setting it. Now `Number(process.env.PORT) || 3000`.
- 2026-07-25 — **Broken/redundant CI** (item 16). Removed the corrupted
  `actions/node-清新@v3` step and the duplicate `deploy.yml`. Single `ci.yml` now
  runs typecheck + tests + build on `actions/setup-node@v4`.
- 2026-07-25 — **No real test runner** (item 15). Added Vitest; replaced the
  fabricated `api.test.ts` (removed) with 14 real RBAC specs. `npm test` runs them.
- 2026-07-24 — **Gemini model was hardcoded to a non-existent `gemini-3.6-flash`**
  (404 on every real call). Now configurable via `GEMINI_MODEL` (default
  `gemini-2.0-flash`) in `server.ts`; documented in `.env.example`.
