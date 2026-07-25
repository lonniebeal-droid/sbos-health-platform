# SBOS HealthOS — Architecture Decision Record

Each entry: decision · why · alternatives rejected · date.

### ADR-001 — Supabase-direct data access (RLS as the boundary)
**Decision:** the SPA reads/writes Supabase directly; security is enforced by
Postgres RLS, not a bespoke API tier. **Why:** fastest path to real, secure,
multi-tenant data on this stack; less middleware to maintain. **Rejected:** a full
Express/GraphQL API gateway in front of the DB (more code; duplicates RLS).
**Date:** 2026-07-25.

### ADR-002 — Repository / mapper / service layering
**Decision:** DB row types → pure mappers → factory repositories → services →
`useAsync` in components. **Why:** testability (mappers/repos unit-tested with a
fake client), one seam for the mock→real swap, typed end to end. **Rejected:**
calling `supabase` inline in components (untestable, scattered). **Date:** 2026-07-25.

### ADR-003 — Cross-org access via SECURITY DEFINER RPCs, not broad policies
**Decision:** where a role needs data outside its org (payer eligibility, message
participation), use audited SECURITY DEFINER functions returning minimal data.
**Why:** preserves strict per-org RLS while enabling legitimate cross-org
workflows; disclosure is explicit and controllable. **Rejected:** loosening RLS
policies to allow cross-org SELECT (leak risk). **Date:** 2026-07-25.

### ADR-004 — Denormalized identity on claims
**Decision:** store patient/provider name + NPI on `claims`. **Why:** a payer must
see who a claim is for without a cross-org join into the servicing org's PHI
(mirrors EDI 837). **Rejected:** cross-org joins (blocked by RLS) or a definer RPC
per claim (heavier). **Date:** 2026-07-25.

### ADR-005 — Demo-data fallback in every screen
**Decision:** components render seed/demo data when Supabase is unconfigured.
**Why:** a fresh clone runs without a backend; graceful degradation. **Rejected:**
hard failure when unconfigured. **Date:** 2026-07-25.

### ADR-006 — Two separate projects/lanes, never merged
**Decision:** `sbos-health-platform` (frontend + Supabase, branch `frontend-ehr-2`)
and `sbos-monorepo` (backend/infra) are developed independently and never merged;
work is isolated in a git worktree. **Why:** two agents/owners working in parallel
without clobbering each other. **Rejected:** single shared branch (caused
collisions). **Date:** 2026-07-25.

### ADR-007 — Disable Storage/analytics locally on Colima
**Decision:** set `[storage].enabled=false` and `[analytics].enabled=false` in
`supabase/config.toml` for local dev. **Why:** those containers report unhealthy
on Colima and block `supabase db reset`; both are unused until real uploads.
**Rejected:** fighting the container health on Colima. **Re-enable** for real
Storage. **Date:** 2026-07-25.

### ADR-008 — Auth model: `public.users` profile keyed to `auth.users`
**Decision:** Supabase Auth owns credentials; a `public.users` profile (role +
org) is auto-created by trigger. RLS reads role/org from it via SECURITY DEFINER
helpers. **Why:** standard Supabase pattern; avoids storing passwords in app
tables; no RLS recursion. **Rejected:** a custom users table with `password_hash`
(dropped). **Date:** 2026-07-25.
