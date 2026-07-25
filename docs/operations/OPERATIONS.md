# SBOS HealthOS — Operations (how we work)

## Repository / lane rules
- Work **only** in `sbos-health-platform`. **Never** touch `sbos-monorepo`.
- Frontend + Supabase lane lives on branch **`frontend-ehr-2`** in a git worktree
  (`.claude/worktrees/claims`). The backend/infra lane is `phase-0-foundations`.
- **Do not merge** the two lanes/projects unless explicitly instructed. When a
  merge is requested, it is a **branch** merge within `sbos-health-platform` only
  (e.g. PR into `phase-0-foundations`), never a cross-repo merge.

## Daily workflow
1. `colima start && supabase start && supabase db reset` (fresh local DB).
2. Build a feature as a vertical: migration → db types → mapper (+ test) →
   repository → service → component wiring → seed.
3. Verify: `npm run lint`, `npm test`, `npm run build`, and a signed-in Node
   script per affected role (RLS check).
4. Commit (small, logical), push, update this manual + PROGRESS/TODO/NEXT_SESSION.

## Git & branch strategy
- Feature work commits directly to the lane branch with descriptive messages
  (`feat(area): …`, `fix`, `docs`, `test`), co-authored trailer included.
- Every commit must leave `lint`/`test`/`build` green.
- Push after each milestone: `git push origin frontend-ehr-2`.
- Never commit `node_modules`, `dist`, or `.env` (gitignored).

## Milestone checklist (Definition of Done)
- [ ] Migration applies cleanly (`supabase db reset`).
- [ ] Mapper/repository/service have unit tests.
- [ ] `npm run lint` + `npm test` + `npm run build` pass.
- [ ] RLS verified per affected role (signed-in query).
- [ ] Component wired with demo fallback; no fake/placeholder logic.
- [ ] Docs updated (this manual + PROGRESS/TODO/NEXT_SESSION).
- [ ] Committed + pushed.

## Deployment process (target — not yet live)
1. Provision hosted, HIPAA-eligible Supabase; sign **BAA**; apply migrations
   (`supabase db push`) + seed reference data (not demo PHI).
2. Set production env/secrets (Supabase keys, `GEMINI_API_KEY`, Stripe, Storage).
3. Deploy the Express AI server (container host) and the built SPA (static host).
4. Enable TLS, backups, MFA; run the security review.
See ROADMAP Phase 5 + SECURITY.md.

## Recovery steps
- **Local DB corrupted / disk full:** free host disk; `colima start`;
  `supabase stop && supabase start`; `supabase db reset`. If the containerd store
  is corrupted, recreate the Colima instance and re-pull images (needs disk).
- **Migration wedged:** fix the SQL, `supabase db reset` (local is disposable).
- **Lost local `.env`:** recreate from `supabase status` (see DEV_SETUP.md).

## Release checklist
- [ ] All milestone DoD items green on the release commit.
- [ ] CHANGELOG.md updated; version bumped in `package.json`.
- [ ] No secrets in git history (rotate if any); `.env` not committed.
- [ ] Security review items (SECURITY.md) addressed for the release scope.
- [ ] Hosted migrations applied; smoke test per role in staging.
