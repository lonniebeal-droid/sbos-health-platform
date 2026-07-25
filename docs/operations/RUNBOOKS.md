# SBOS HealthOS — Deployment Runbooks

Three environments: **Local** (works today), **Staging**, **Production**. Staging
and Production require owner-provided infra/credentials and are **not yet set up**;
their runbooks are the intended procedure.

---

## 1. Local Development  ✅ (operational)

### Prereqs
Colima + Docker CLI, Supabase CLI, Node, ~5 GB free disk.

### Bring up
```bash
cd /Users/lonniebgroupllc/sbos-health-platform/.claude/worktrees/claims
colima start --cpu 4 --memory 8 --disk 60     # if not running
supabase start                                 # local Postgres/Auth/PostgREST
supabase db reset                              # apply 13 migrations + seed
# .env: VITE_SUPABASE_URL/ANON_KEY from `supabase status`; GEMINI_* optional
npm install
npm run lint && npm test && npm run build
npm run dev                                    # Express + Vite on :3000
```

### Verify (no browser needed)
Sign in as a seeded user via a Node `@supabase/supabase-js` script and query —
RLS applies. Accounts (pw `Password123!`): provider@bayarea.test,
patient@bayarea.test, payer@sbospremier.test, admin@bayarea.test, employer@acme.test.

### Recovery
- Disk full / containers dead → free disk; `colima start`; `supabase stop && start`;
  `supabase db reset`. If containerd corrupted, recreate the Colima instance.
- Storage/analytics disabled in `config.toml` (Colima health) — expected.

---

## 2. Staging  🔴 (not set up — procedure)

### Provision (owner)
1. Create a **hosted Supabase project** (paid tier for realistic parity; BAA not
   required for synthetic data). Record project ref + keys.
2. Link: `supabase link --project-ref <ref>`; push schema: `supabase db push`.
3. Seed **reference** data only (orgs, feature flags) — **no real PHI**; synthetic
   test accounts are fine.
4. Storage: create buckets (`documents`, `message-attachments`) + policies.
5. Set secrets (staging): Supabase URL/anon/service-role, `GEMINI_API_KEY`,
   Stripe **test** keys, SMTP (for invites).

### Deploy
- SPA: `npm run build` → deploy static assets (Vercel/Netlify/Cloudflare/S3+CDN).
- Express AI server: containerize (Dockerfile in repo) → container host
  (Cloud Run/Fly). Env: `GEMINI_API_KEY`, `PORT`.
- Configure SPA env to point at the hosted Supabase URL/anon key.

### Verify
Run the signed-in RLS integration suite per role; smoke-test each portal; verify
invitations/email, eligibility RPC, messaging, claims lifecycle end-to-end.

---

## 3. Production  🔴 (not set up — procedure; PHI-gated)

### Preconditions (owner, hard gates)
- **Signed BAA** with Supabase (HIPAA-eligible plan) **and** with the AI provider
  before any real PHI passes through Jessie.
- Stripe **live** keys; production SMTP; domain + DNS + TLS; secret manager.
- Security review / pen test complete (SECURITY.md checklist green where required).

### Deploy
1. Apply migrations to prod Supabase (`supabase db push`); **no demo seed**.
2. Enable: TLS everywhere, MFA, automated backups + PITR, log retention.
3. Deploy SPA (static, CDN) + Express AI server (autoscaled container) with prod secrets.
4. Configure Storage buckets + strict policies; rate limiting; WAF/CDN.
5. Turn on audit-on-read; ship audit logs to retained storage.

### Post-deploy verification
- Per-role RLS + tenant-isolation smoke tests in prod (synthetic tenant first).
- Health checks (`/api/health`), error monitoring, uptime alerting.
- Confirm no service-role key in any client bundle; secrets only server-side.

### Rollback
- App: redeploy previous build/image.
- DB: forward-fix migrations (never destructive down-migrations on prod PHI);
  restore from PITR only as a last resort.

### Release gate
All boxes in RELEASE_PLAN.md for the target stage + SECURITY.md production
checklist must be satisfied before promoting.
