# SBOS HealthOS — Developer Setup

## Prerequisites
- Node (tested on v26) + npm
- **Colima** (Docker runtime) + Docker CLI — `brew install colima docker`
- **Supabase CLI** — `brew install supabase/tap/supabase`
- ~5 GB free disk for Supabase images (see KNOWN_ISSUES — keep disk free)

## Repository & branch
- Repo: `sbos-health-platform` only. **Do not touch `sbos-monorepo`.**
- Active branch: `frontend-ehr-2` (frontend + Supabase lane). Not merged.
- This lane is developed in a git worktree at `.claude/worktrees/claims`.

## First-time setup
```bash
cd /Users/lonniebgroupllc/sbos-health-platform/.claude/worktrees/claims
colima start --cpu 4 --memory 8 --disk 60      # if not running
supabase start                                  # boots local Postgres/Auth/etc.
supabase db reset                               # applies migrations + seed
npm install
cp .env.example .env                            # fill Supabase local values (see below)
```

### .env (local)
`supabase status` prints the local values. Set:
```
VITE_SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_ANON_KEY="<anon key from supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<service_role key>"   # server-side only, not used by SPA
GEMINI_API_KEY="<optional, enables /api/ai/*>"
GEMINI_MODEL="gemini-2.0-flash"
```
The anon/service keys are the well-known local demo keys; never reuse in prod.

## Config notes (local Colima)
`supabase/config.toml` disables **analytics** and **storage** locally — those
containers report unhealthy on Colima and block `supabase db reset`. Re-enable
when wiring real Storage uploads.

## Daily commands
```bash
npm run dev        # tsx server.ts (Express + Vite middleware), port 3000 (PORT overrides)
npm run lint       # tsc --noEmit
npm test           # vitest (55)
npm run build      # vite build + esbuild server bundle
supabase db reset  # re-apply schema + seed after migration changes
```

## Local test accounts (password `Password123!`)
`provider@bayarea.test` · `patient@bayarea.test` · `payer@sbospremier.test` ·
`admin@bayarea.test` · `employer@acme.test`

## Verifying data/RLS without the browser
The in-app browser can't reach `localhost` here (a local auth-gateway intercepts
loopback). Verify via Node scripts using `@supabase/supabase-js`: sign in as a
seeded user and query — RLS applies. (See `_v*.mjs` patterns in git history.)

## Studio
Supabase Studio: http://127.0.0.1:54323 (when the stack is up).
