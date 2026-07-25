# SBOS HealthOS — Engineering Progress & Handoff

**Branch:** `phase-0-foundations` (pushed to origin) · **Last updated:** 2026-07-25
**State:** compiles (`tsc` clean) · 33 tests pass · production build succeeds · local
Supabase stack running.

This is a living checkpoint. Update it as milestones land.
**Resume brief:** [`docs/NEXT_SESSION.md`](docs/NEXT_SESSION.md) ·
**Task list:** [`docs/TODO.md`](docs/TODO.md)

---

## What has been completed

### Documentation (honest, verified)
- Replaced the four fabricated reports with ground-truth versions and added
  `AUDIT_REAL.md`. All are living docs with verified status.

### Foundations
- Real **Vitest** runner; 30 tests (RBAC matrix, mappers, repositories, services).
- Single working **CI** (`.github/workflows/ci.yml`) running typecheck + tests + build.
- Gemini model made configurable (`GEMINI_MODEL`); invalid hardcoded model removed.
- `server.ts` honors `process.env.PORT`.

### Backend (local Supabase via Colima)
- Colima + Docker CLI + Supabase CLI installed; stack runs locally
  (analytics disabled in `config.toml` for Colima).
- **One canonical schema** (enterprise); conflicting init migration removed.
- **Auth + real RLS** migration: `public.users` linked to `auth.users`,
  `password_hash` dropped, uniform `organization_id` added where missing, helper
  functions + new-user trigger, and real per-tenant RLS on every tenant table.
  Verified: anon reads only the org directory; PHI tables deny anon; each role
  sees only its org's rows.
- **Seed** with 4 real Supabase Auth users + sample clinical data.
- Patient profile fields migration (vitals / family / PCP).

### Application
- Typed data layer: `supabaseClient`, `db/database.types`, `db/mappers`,
  `repositories`, `services/authService`, `services/organizationService`,
  `hooks/useAsync`.
- **Real login flow**: `authContext` + `LoginScreen`; app gates on auth when
  Supabase is configured, derives role from the profile, supports sign-out;
  dev-fallback (no login) when unconfigured so a fresh clone still runs.
- **Org context** loads real organizations (fallback to sample).
- **Mock→real migrations done:** provider Patient Directory, patient Prescriptions,
  and patient Dashboard appointments (all live, RLS-scoped, with demo fallback).

### Local test accounts (password `Password123!`)
`provider@bayarea.test` · `patient@bayarea.test` · `payer@sbospremier.test` · `admin@bayarea.test`

---

## Commits on this branch (newest first)
```
feat(ehr): prescriptions view reads real data + real refill
feat(ehr): patient directory reads real data from Supabase
feat(auth): real login flow wired into the app
feat(db): local seed with real auth users + sample clinical data
docs: update living reports for the real data layer + RLS milestone
test: cover mappers, repositories, and auth/org services
feat(data): typed Supabase data layer (client, repositories, services)
feat(db): canonical schema + real RLS + Supabase Auth integration
ci: consolidate into one working pipeline that runs tests
test: add real Vitest runner and replace fabricated tests
fix(ai): make Gemini model configurable and correct invalid model id
docs: replace fabricated reports with verified ground-truth audit
```

---

## Remaining tasks (prioritized, all doable without owner input)

1. **Migrate remaining components off mocks** (~19 left) via the proven
   repository/`useAsync` pattern: appointments, claims (ClaimsTracker,
   InsuranceClaimsCenter), medical records, benefits, prior auth, lab hub,
   provider clinical docs, admin tenant/audit views, employer portal.
2. **Remove/replace fake `server.ts` endpoints** now that real auth + data exist
   (auth/login, tenants, appointments, messages, billing, notifications, storage,
   audit, analytics, graphql). Keep the real `/api/ai/*` and `/api/health`.
3. **Schema extensions** for domains the UI needs but the DB lacks: `patient_messages`,
   `benefits_plans`, `medical_records`, provider profile fields (rating/bio/avatar/
   affiliation), appointment↔domain name joins.
4. **RBAC in RLS** (per-role writes) + real **audit logging** on PHI access.
5. **Harden `server.ts`**: input validation, security headers (helmet), rate limiting.
6. Fix remaining debt: two package managers (`bun.lock` vs `package-lock.json`),
   `package.json` name/version, claims provider-side RLS, OpenAPI spec.
7. Add integration tests that sign in and assert RLS per role.

---

## Current blockers
- **None that stop local development.**
- **Browser smoke-test of the running SPA is blocked** by a local auth-gateway
  bound to `127.0.0.1` that intercepts loopback ports and redirects to `/login`.
  The app boots cleanly on `0.0.0.0` and the data layer is verified via a real
  Supabase client + tests; only the in-browser visual check is affected.

## Needs owner input (only when we go beyond local)
- Hosted Supabase project + **signed BAA** before any real PHI (HIPAA).
- Production secrets / domain / DNS / payment-processor and clearinghouse creds.

---

## Exact next recommended step
Migrate **claims** to real data: add `claims.listDetailed()` (join patient +
provider names), a `mapClaim()` (map `icd10_codes`/`cpt_codes`, amounts, status,
ai_risk_*), then wire `ClaimsTracker` (patient) and `InsuranceClaimsCenter`
(payer) via `useAsync` with demo fallback. Note claims RLS is payer-scoped, so
the patient view will need a provider/patient-side claims policy (see TECH_DEBT
item 23) — add that policy in the same migration. Verify with `supabase db reset`
+ signed-in queries for both a payer and a patient, then `npm test` + `npm run build`.

---

## Backend / Infra lane (separate session — `server.ts`, Docker, CI, terraform, scripts)

Kept strictly isolated from the frontend/Supabase lane (no edits to `src/` or
`supabase/`). Each item below was built, tested, container-verified, committed,
and pushed; CI (`build-and-test` + a `docker` smoke-test job) is green.

- **Removed dead fake REST endpoints** from `server.ts` (auth/tenants/
  appointments/messages/telehealth/billing/notifications/storage/audit/
  analytics/graphql) — they returned fabricated literals and were unused
  (the client reads Supabase directly). Real surface: `/api/health`,
  `/api/ai/*`, `/api/docs/openapi.json`; unknown `/api/*` → JSON 404.
  `docs/openapi.json` pruned to match.
- **Dockerfile hardened:** dedicated prod-deps stage (dev tooling out of the
  image), image `HEALTHCHECK`, and a fix — the runner now ships `docs/`, so
  `/api/docs/openapi.json` no longer 404s in-container.
- **Security:** `/api/ai/chat` no longer leaks internal error text to clients
  (now matches the other AI handlers).
- **Tests:** `tests/server.test.ts` covers the per-IP rate limiter (limit/
  reset/isolation/fallback); `rateLimit` exported and auto-start guarded under
  Vitest.
- **CI:** added a `docker` job asserting the runtime contract on every push;
  bumped checkout/setup-node to v5.
- **Compose:** dropped obsolete `version` key, added `start_period` + a
  `GEMINI_MODEL` passthrough.
- **Terraform:** removed a committed DB password default; added
  `terraform/.gitignore` + `example.tfvars`. (The old value is still in git
  history and **must be rotated**.)
- **Scripts:** `scripts/deploy.sh` turned from a faked script into a real
  release preflight (build + live container smoke test on a free port).
- **Docs:** added [`docs/BACKEND.md`](docs/BACKEND.md) describing the real API,
  security posture, env, run/verify steps, and known gaps.
- **Perf + reliability:** memoized the Gemini client (was reconstructed on every
  AI request) and added an upstream `GEMINI_TIMEOUT_MS` (default 30s) so a hung
  Gemini call can't hold a request open indefinitely. Tests assert reuse +
  rebuild-on-key-change (48 tests total).
- **Reliability + CI security:** added `unhandledRejection`/`uncaughtException`
  process handlers (log; exit non-zero on uncaught so the orchestrator restarts
  a clean instance); set least-privilege `permissions: contents: read` on the
  CI workflow.
- **Runtime bump:** Node 20 (EOL) → Node 22 LTS in the Dockerfile (all 3 stages)
  and CI. Image build + container smoke test verified on `v22`; `npm audit`
  reports 0 vulnerabilities.
- **DX:** added a root `README.md` (architecture, prerequisites, quick start,
  scripts, env, Docker, testing, doc index) — the repo had none. Accurate to the
  code; links verified.
- **Dedup + reliability:** extracted `generateJson()` + `parseJsonLoose()` from
  the two structured AI handlers (removed duplicated generateContent/parse) and
  made JSON parsing tolerant of ```json fences the model sometimes emits. 4 new
  parser tests (52 total).

Backend follow-ups needing credentials or a decision: authenticate `/api/ai/*`
(needs the Supabase JWT secret), shared-store rate limiter for multi-instance,
CSP header, and moving `DATABASE_URL` to Secret Manager.
