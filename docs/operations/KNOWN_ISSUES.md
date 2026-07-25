# SBOS HealthOS — Known Issues

Legend: **P0** blocker · **P1** major · **P2** minor. Status: Open / Mitigated / Blocked(owner).

| # | Pri | Issue | Status | Workaround / Notes | Owner |
|---|-----|-------|--------|--------------------|-------|
| 1 | P0 | **Host disk full** (`/System/Volumes/Data` 100%) filled the Colima disk image, corrupted the containerd blob store (I/O errors), killed local Supabase Postgres/storage containers | Blocked(owner) | Freed dev caches (npm ~0.6G, build artifacts). Bulk is the owner's personal data (411G) — must be triaged by owner. Then `colima start` / `supabase start` / `supabase db reset` | Owner |
| 2 | P1 | Live per-role RLS re-check for **messaging** pending (DB down from #1) | Open | Migration applied cleanly before outage; tsc/tests/build green; verify after #1 | Eng |
| 3 | P1 | **Tenant provisioning + user invitations** not implementable in browser lane | Blocked(owner) | Needs Supabase **service-role key** + email/SMTP (server/edge function) | Owner |
| 4 | P1 | **Document uploads** unavailable | Blocked(owner) | Needs Supabase **Storage** bucket (disabled locally); attachment table is metadata-only | Owner |
| 5 | P1 | **Bill pay** not real | Blocked(owner) | Needs **Stripe** credentials; build a payments abstraction | Owner |
| 6 | P2 | Supabase **Storage + analytics disabled** in `config.toml` for Colima | Mitigated | Unhealthy containers block `db reset`; unused for now; re-enable with real uploads | Eng |
| 7 | P2 | In-app browser can't reach `localhost` (local auth-gateway intercepts loopback) → no browser smoke test/e2e locally | Mitigated | Verify via Node/supabase-js scripts; e2e in CI later | Eng |
| 8 | P2 | `package.json` name `react-example`, version `0.0.0` | Open | Rename + version | Eng |
| 9 | P2 | Two package managers across lanes (`bun.lock` + `package-lock.json`) | Open | Converge (mostly backend lane) | Eng |
| 10 | P2 | No component/integration/e2e tests (unit only) | Open | Add per TESTING.md Phase 5 | Eng |
| 11 | P2 | Four historical org/tenant data sources not fully consolidated | Open | Org context now uses real orgs; retire remaining mock sources | Eng |
| 12 | P2 | Docs may diverge between `frontend-ehr-2` and `phase-0-foundations` (no-merge rule) | Open | Keep this manual authoritative for the frontend lane | Eng |
