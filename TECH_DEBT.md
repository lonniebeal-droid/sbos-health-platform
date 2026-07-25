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
| 1 | **No real backend** | Every non-AI endpoint in `server.ts` returns hardcoded literals. No persistence. |
| 2 | **No authentication** | `/api/auth/login` ignores passwords and returns a fake token; no route verifies sessions. |
| 3 | **Conflicting DB schemas** | Two migrations define incompatible table sets (`tenants/profiles` vs `organizations/users/...`). Choose one canonical schema. |
| 4 | **Broken RLS** | Policies use `OR TRUE` (allow-all); RLS enabled on only 4 of 12 tables. No tenant isolation. |
| 5 | **Fabricated-claim risk** | Prior versions of the reports claimed controls that don't exist. Reports were rewritten 2026-07-24; keep them honest going forward. |
| 6 | **No input validation / rate limiting / security headers** | All endpoints trust `req.body`; no helmet/CORS/limits. |

## P1 — Blocks Real Features

| # | Item | Detail |
|---|---|---|
| 7 | **`@supabase/supabase-js` unused** | Installed but never imported. No DB client wiring on server or client. |
| 8 | **RBAC never enforced** | `permissions.ts` is correct but not called by any route or UI guard. |
| 9 | **Components import mocks directly** | 21 components import from `data/mock*`. Needs a single data-access seam so mock→real is one change. |
| 10 | **Four inconsistent org/tenant sources** | `/api/tenants`, `mockTenants.ts`, `organizationContext.tsx`, SQL seeds all disagree. |
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

- 2026-07-25 — **Broken/redundant CI** (item 16). Removed the corrupted
  `actions/node-清新@v3` step and the duplicate `deploy.yml`. Single `ci.yml` now
  runs typecheck + tests + build on `actions/setup-node@v4`.
- 2026-07-25 — **No real test runner** (item 15). Added Vitest; replaced the
  fabricated `api.test.ts` (removed) with 14 real RBAC specs. `npm test` runs them.
- 2026-07-24 — **Gemini model was hardcoded to a non-existent `gemini-3.6-flash`**
  (404 on every real call). Now configurable via `GEMINI_MODEL` (default
  `gemini-2.0-flash`) in `server.ts`; documented in `.env.example`.
