# OPERATIONS — SBOS HealthOS

How engineers operate this project day to day.

## Daily workflow

1. `git fetch` + fast-forward to `origin/phase-0-foundations` before starting.
2. Work **only in your lane** (see [DECISIONS D1](DECISIONS.md#d1)):
   - Backend/infra: `server.ts`, `Dockerfile`, `docker-compose.yml`, `.github/`,
     `terraform/`, `scripts/`, `docs/`.
   - Frontend/Supabase: `src/`, `supabase/`.
   - Shared files (`package.json`, `tsconfig.json`, `vitest.config.ts`,
     `.gitignore`) — coordinate before editing.
3. For each change: read → change → `npm run lint` → `npm test` → (if
   backend/Docker) container check → update the relevant `docs/operations/*` +
   `PROGRESS.md` → commit → push.
4. Keep documentation synchronized with code (see the maintenance rule below).

## Git & branch strategy

- Active branch: **`phase-0-foundations`**. Commit small, verified units.
- Before pushing, `git fetch` and rebase onto `origin/phase-0-foundations`
  (the two lanes push to the same branch; rebasing keeps history linear and
  avoids clobbering the other lane).
- Commit messages: conventional prefixes (`fix`, `feat`, `refactor`, `chore`,
  `ci`, `docs`, `security`) + a body explaining *why* and the verification done.
- Never `git add -A` blindly — stage the specific files in your lane.

## Deployment process (target; parts blocked)

1. CI green on the commit (typecheck + tests + build + docker smoke).
2. Build/publish the image (Node 22 multi-stage).
3. Provide runtime env: `GEMINI_API_KEY`, Supabase URL + keys, `NODE_ENV=production`.
4. Deploy the container to the chosen host (Cloud Run or similar) — **needs
   credentials + the data-plane decision** ([DECISIONS D5](DECISIONS.md#d5)).
5. Apply DB migrations against the hosted Supabase (`supabase db push`).
6. Verify `/api/health` and a signed-in smoke path.

Local preflight before any deploy: `./scripts/deploy.sh`.

## Release checklist

- [ ] CI green (both jobs).
- [ ] `npm run lint`, `npm test`, `npm run build` pass locally.
- [ ] Docker image builds and serves the runtime contract (CI docker job or
      `scripts/deploy.sh`).
- [ ] `docs/operations/PROJECT_STATUS.md` + `CHANGELOG.md` updated.
- [ ] No secrets in the diff; `.env`/tfvars not staged.
- [ ] Known P1 issues reviewed ([KNOWN_ISSUES](KNOWN_ISSUES.md)).
- [ ] (PHI go-live) BAA signed, AI auth enabled, secrets in Secret Manager,
      historical password rotated.

## Recovery steps

- **Bad deploy:** redeploy the previous image tag; the server drains on
  `SIGTERM` (graceful shutdown) and the orchestrator restarts on
  `uncaughtException`.
- **Container won't start:** check logs for the `[SBOS Platform] Running…` line;
  confirm `dist/` and `docs/` are present in the image and env vars are set.
- **AI 5xx spike:** check `GEMINI_API_KEY`/quota and `GEMINI_TIMEOUT_MS`; the
  demo fallback path only triggers when the key is **absent**, not on API errors.
- **Local Docker `ENOSPC`/`I/O error`:** the Colima VM disk filled; prune build
  cache (`docker builder prune -af`). Do not restart a Colima VM shared with a
  running Supabase stack; use CI to verify instead.
- **DB issue (local):** `supabase db reset` re-applies migrations + seed.

## Observability (current)

- Structured request logs on `/api` (`[SBOS] METHOD URL STATUS ms`).
- Process-level `unhandledRejection` / `uncaughtException` logging.
- **Gaps:** logs go to stdout only (no shipping/aggregation); no metrics/traces;
  no alerting. See [ROADMAP Phase 3](ROADMAP.md).

## Documentation maintenance rule

This manual is a **living document**. On every code/architecture change or
completed milestone, update the affected doc(s) — at minimum `PROJECT_STATUS.md`
and `CHANGELOG.md`. Never let the docs claim features that aren't implemented or
production-readiness that isn't verified. A new engineer should understand the
whole project from this folder within an hour.
