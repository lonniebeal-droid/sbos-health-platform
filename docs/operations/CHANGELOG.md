# CHANGELOG — SBOS HealthOS

Completed milestones, grouped by date. Backend/infra lane commits are precise
(this session); frontend/Supabase lane items are summarized from git history.

## 2026-07-25

### Backend / Infra lane
- `315b16c` ci: send oversized-body test from a file (fix argv-too-long on CI).
- `49b3c3a` ci: assert 4xx client-error contract in the docker smoke test.
- `6df0205` fix(server): return correct 4xx for client errors (malformed→400,
  oversized→413) instead of blanket 500.
- `3e7c1db` docs: FINAL_AUTONOMOUS_REPORT for the backend/infra lane.
- `7acd3a1` refactor(server): dedup structured AI handlers + fence-tolerant JSON
  parse (`generateJson` / `parseJsonLoose`).
- `fa57aee` docs: add root README.
- `98fe53e` chore: bump Node 20 (EOL) → 22 LTS in Docker and CI.
- `a09d587` reliability+ci: process fault handlers (`unhandledRejection`/
  `uncaughtException`); least-privilege CI token.
- `55f26f4` perf+reliability: memoize Gemini client; add `GEMINI_TIMEOUT_MS`.
- `2270f1b` docs(progress): record backend/infra lane work.
- `01550ab` ci: bump checkout/setup-node to v5.
- `d5a6d60` docs: add `docs/BACKEND.md`.
- `7efaf55` chore(compose): drop obsolete `version`, add `start_period` +
  `GEMINI_MODEL` passthrough.
- `a7d3eaf` harden(server): stop leaking error details; add rate-limiter tests.
- `3497679` chore(scripts): make `deploy.sh` an honest release preflight.
- `7e7069e` ci: add docker job that builds the image and smoke-tests runtime.
- `856cf98` security(terraform): remove committed DB password; gitignore
  state/tfvars.
- `53f15d8` build(docker): slim runtime image, ship `docs/`, add `HEALTHCHECK`.
- `9c0c5dc` refactor(server): remove dead fake REST endpoints.
- Started the Engineering Operations Manual (`docs/operations/`).

### Frontend / Supabase lane (summarized)
- Claims migrated to live data (payer + patient views) with visibility RLS.
- Medical records + benefits plans tables and live-data wiring.
- Patient profile fields; auth integration + RLS helpers.

## Earlier (pre-2026-07-25, from repo history)
- Enterprise schema (10 tables, 7 enums) and initial RLS.
- Typed data layer (`supabaseClient → repositories → mappers → useAsync`).
- Role portals scaffolding (patient/provider/insurance/employer/admin/rcm).
- Gemini AI endpoints (`/api/ai/*`) with demo fallback.
- Initial Docker + CI.

> Maintenance rule: append a dated entry here whenever a milestone completes.
