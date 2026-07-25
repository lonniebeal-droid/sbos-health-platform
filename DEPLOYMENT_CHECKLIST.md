# DEPLOYMENT CHECKLIST — SBOS HealthOS

Release-lens deployment readiness. Date: 2026-07-25 · Commit: `453bd8d`.
Operational detail: [`docs/operations/OPERATIONS.md`](docs/operations/OPERATIONS.md).

## Findings & evidence (readiness by area)

| Area | State | Evidence |
| ---- | ----- | -------- |
| Build reproducible | ✅ | `npm run build` + multi-stage `Dockerfile` (Node 22) |
| Container runs non-root + healthcheck | ✅ | `Dockerfile` `USER node` + `HEALTHCHECK` |
| CI gate | ✅ | `.github/workflows/ci.yml` — typecheck+test+build+docker smoke; green @ `453bd8d` |
| Runtime contract verified | ✅ | CI docker job asserts 200/404/400/413 |
| Config via env | ✅ | `.env.example`; compose passes GEMINI_* |
| Hosted data plane | ❌ | Supabase local only; not provisioned |
| Secrets management | ❌ | env only; no Secret Manager |
| TLS / DNS / domain | ❌ | not provisioned |
| AuthN on AI endpoints | ❌ | unauthenticated |
| BAA signed | ❌ | required for PHI |
| Backups / monitoring / alerting | ❌ | not configured |

## Pre-deploy checklist

- [ ] CI green (both jobs) on the release commit.
- [ ] `./scripts/deploy.sh` preflight passes (or CI docker job).
- [ ] Runtime env set: `GEMINI_API_KEY`, `GEMINI_MODEL`, `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NODE_ENV=production`.
- [ ] Migrations applied to hosted Supabase (`supabase db push`).
- [ ] `/api/health` returns 200 post-deploy; signed-in smoke path works.
- [ ] TLS/DNS in place; HSTS effective.
- [ ] **PHI go-live:** BAA signed, AI auth enabled, secrets in Secret Manager,
      historical terraform password rotated, RLS verified.

## Completed fixes

- Image slimmed + `HEALTHCHECK` + `docs/` shipped (`53f15d8`); Node 22 (`98fe53e`);
  honest `scripts/deploy.sh` preflight (`3497679`); CI docker smoke + client-error
  checks (`7e7069e`, `49b3c3a`, `315b16c`).

## Deferred / blockers

- Provision hosted Supabase, DNS, TLS, Secret Manager (owner/infra).
- Resolve GCP-Cloud-SQL-vs-Supabase data-plane decision ([DECISIONS D5](docs/operations/DECISIONS.md#d5)).
- CD pipeline (image publish + deploy); backups; monitoring/alerting.

## Overall risk level

**NOT DEPLOYABLE to production with PHI** today. Deployable to a non-PHI/demo
environment behind TLS with the env set. Risk: **High** for PHI, **Low–Medium**
for demo.
