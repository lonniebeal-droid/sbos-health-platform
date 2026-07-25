# PROJECT STATUS — SBOS HealthOS

> Primary dashboard. Living document — update on every meaningful change.
> All figures are grounded in the repository, not aspiration. Percentages are
> **estimates** with stated rationale, not precise measurements.

| Field | Value |
| ----- | ----- |
| Current date | 2026-07-25 |
| Current branch | `phase-0-foundations` |
| Latest commit | `315b16c` — ci: send oversized-body test from a file (fix argv-too-long) |
| Current version | `package.json` = `0.0.0`; app self-reports `3.4.0-enterprise` at `/api/health` (inconsistent — see [KNOWN_ISSUES](KNOWN_ISSUES.md)) |
| Overall completion | ~55% (est.) — scaffold + several domains wired to live data; not deployed |
| MVP completion | ~60% (est.) — core portals + data layer exist; end-to-end against hosted infra unverified |
| Production readiness | ~30% (est.) — **NOT production-ready**; see [SECURITY](SECURITY.md) / [DEPLOYMENT gaps](../../DEPLOYMENT_GUIDE.md) |
| Current phase | Phase 0 — Foundations / production-readiness hardening |
| Current milestone | Backend/infra hardening complete; docs manual in progress |
| Current priority | Bug fixes → security hardening → reliability (see [ROADMAP](ROADMAP.md)) |

## Two-lane development model

Work proceeds in two isolated lanes (see [DECISIONS](DECISIONS.md#d1)):

- **Backend/infra lane** — `server.ts`, `Dockerfile`, `docker-compose.yml`,
  `.github/`, `terraform/`, `scripts/`, `docs/`. Hardened, tested, CI-green.
- **Frontend/Supabase lane** — `src/`, `supabase/`. Portals + typed data layer
  + migrations/RLS.

## Working features (verified present in the repo)

- **Backend API** — `/api/health`, `/api/ai/chat`, `/api/ai/clinical-notes`,
  `/api/ai/fraud-analysis` (Gemini, demo fallback), `/api/docs/openapi.json`.
  Security headers, per-IP rate limiting, correct 4xx/5xx handling, graceful
  shutdown, process fault handlers. **Verified:** 52 tests, CI green, container
  smoke test.
- **Data layer** — typed `supabaseClient → repositories → mappers → useAsync`
  for organizations, users, patients, appointments, claims, prescriptions,
  prior-auths, audit logs. **Verified:** unit tests for mappers/data-layer.
- **Database** — 12 tables, 7 enums, ~20 RLS policies, 3 helper functions
  across 6 migrations (see [DATABASE](DATABASE.md)).
- **Portals (UI present)** — patient (9 components), provider (4), rcm (4),
  insurance (2), admin (2), employer (1). Depth not independently verified.
- **CI/CD** — typecheck + tests + build + Docker smoke test on every push.

## Features in progress

- Migration of remaining domains to live Supabase data (frontend lane).
- Documentation Operations Manual (this folder).

## Blocked features (need credentials / infra / decisions)

- Authentication on `/api/ai/*` (needs Supabase JWT secret).
- Hosted Supabase + signed BAA before real PHI.
- Multi-instance rate limiting (needs Redis).
- Secrets in Secret Manager; DNS; payment/clearinghouse integrations.

See [KNOWN_ISSUES](KNOWN_ISSUES.md) for the full list with owners.

## Technical debt (high-level)

- Unused `graphql` dependency (dead).
- `tsconfig` `strict` is off.
- Health-endpoint version string is fabricated/inconsistent with `package.json`.
- In-memory rate limiter (single-instance only).

Full ledger: repo-root [`TECH_DEBT.md`](../../TECH_DEBT.md) and
[operations/KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Open bugs

- **Critical:** none known/verified.
- **Non-critical:** see [KNOWN_ISSUES](KNOWN_ISSUES.md).

## Recent commits (backend/infra lane)

```
315b16c ci: send oversized-body test from a file (fix argv-too-long)
49b3c3a ci: assert 4xx client-error contract in the docker smoke test
6df0205 fix(server): return correct 4xx for client errors, not blanket 500
3e7c1db docs: add FINAL_AUTONOMOUS_REPORT for the backend/infra lane
7acd3a1 refactor(server): dedup structured AI handlers + fence-tolerant JSON parse
fa57aee docs: add root README
98fe53e chore: bump Node 20 (EOL) -> 22 LTS in Docker and CI
a09d587 reliability(server)+ci: process fault handlers, least-privilege token
55f26f4 perf+reliability(server): memoize Gemini client, add upstream timeout
```

## Next planned work

1. Remaining verifiable bug fixes / security hardening in the backend lane.
2. Keep this manual synchronized with the code.
3. Frontend lane (other session): finish live-data migration of remaining domains.
