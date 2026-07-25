# RELEASE AUDIT — SBOS HealthOS

Consolidated release audit. Date: 2026-07-25 · Branch: `phase-0-foundations` ·
Commit: `453bd8d`. Lenses: [SECURITY_REVIEW](SECURITY_REVIEW.md) ·
[PERFORMANCE_REVIEW](PERFORMANCE_REVIEW.md) ·
[DEPLOYMENT_CHECKLIST](DEPLOYMENT_CHECKLIST.md) ·
[KNOWN_LIMITATIONS](KNOWN_LIMITATIONS.md) · manual: [`docs/operations/`](docs/operations/README.md).

## Scope & method

Full read of the repository. Backend/infra lane changed and verified in this
engagement; frontend/Supabase lane read-only (owned by a concurrent session).
Verification = typecheck (`tsc`), unit tests (Vitest), production build
(`vite`+`esbuild`), and — because local Docker is degraded (host disk full) — the
**GitHub Actions docker smoke test** as the authoritative container gate.

## Findings (summary)

| Area | Key finding | Where |
| ---- | ----------- | ----- |
| Bugs | Client errors (malformed/oversized body) returned 500 instead of 400/413 | **Fixed** `6df0205` |
| Security | AI endpoints unauthenticated; historical secret in git history | SECURITY_REVIEW S1/S2 |
| Performance | Per-request AI client; no timeout; duplicated call paths | **Fixed** `55f26f4`,`7acd3a1` |
| Reliability | No process fault handlers | **Fixed** `a09d587` |
| Deployment | No hosted infra/secrets/TLS/BAA | DEPLOYMENT_CHECKLIST |
| Docs | No operations manual; no root README | **Fixed** (`docs/operations/*`, README) |

## Evidence (current verification, commit `453bd8d`)

- `npm run lint` (tsc --noEmit): clean.
- `npm test`: **52 passed / 52** (4 files).
- `npm run build`: succeeds (SPA + `dist/server.cjs`).
- `npm audit`: **0 vulnerabilities**.
- CI: **green** (build-and-test + docker) @ `453bd8d`.

## Completed fixes (this engagement)

Bug fix (4xx handling), error-leak fix, Gemini client memoization + timeout,
AI-handler dedup + fence-tolerant parsing, process fault handlers, correct HTTP
status semantics, Docker slimming + healthcheck + `docs/` fix, Node 22, CI docker
smoke + client-error regression guards, least-privilege CI token, terraform secret
removal, honest deploy preflight, backend unit tests (rate limiter, AI client,
parser), full Operations Manual + root README. Commit list in
[RELEASE_FINAL_REPORT](RELEASE_FINAL_REPORT.md).

## Deferred work

Auth on AI endpoints, CSP, RLS-parity tests, DB indexing, coverage tooling,
component/integration tests, feature modules (billing/notifications/messaging/
telehealth/RCM integrations), observability shipping. Owners in KNOWN_ISSUES.

## Remaining blockers

Credentials/infra/business: hosted Supabase + BAA, Supabase JWT secret, Redis,
Secret Manager, DNS/TLS, payment/notification/clearinghouse providers, and the
GCP-vs-Supabase data-plane decision. Cross-lane: `graphql` removal, `tsconfig`
strict (in `package.json`/`tsconfig.json`).

## Risk level

- Implemented backend surface (non-PHI): **Low**.
- Production with PHI: **High** until blockers resolved — **do not launch with
  real PHI yet**.
