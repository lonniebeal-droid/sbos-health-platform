# KNOWN ISSUES — SBOS HealthOS

Every known issue with priority, status, workaround, and owner. Priorities:
P1 (blocker/security), P2 (important), P3 (minor). "Owner lane": backend/infra
(this session) vs frontend/Supabase (other session) vs owner (human/business).

| # | Issue | Priority | Status | Workaround | Owner |
| - | ----- | -------- | ------ | ---------- | ----- |
| 1 | `/api/ai/*` endpoints are unauthenticated (rate-limited only) | P1 | Open (blocked) | Keep behind a trusted network; rely on rate limits | backend + owner (needs Supabase JWT secret) |
| 2 | Historical terraform DB password remains in git history | P1 | Open | Rotate the credential before any use | owner |
| 3 | No Content-Security-Policy header | P2 | Open | Other security headers in place | backend + frontend (needs SPA needs) |
| 4 | RLS ↔ client-gate parity not fully verified for every table | P2 | Open | Manual review per table | frontend/Supabase |
| 5 | In-memory rate limiter is per-instance | P2 | Open (blocked) | Single instance only for now | backend + infra (needs Redis) |
| 6 | Unused `graphql` dependency (dead) | P3 | Open | None needed | frontend (owns `package.json`) |
| 7 | `tsconfig` `strict` is off | P2 | Open | Careful reviews | frontend (owns `tsconfig.json`) |
| 8 | Health endpoint reports `3.4.0-enterprise`; `package.json` is `0.0.0` | P3 | Open | Treat health version as cosmetic | backend/owner (version policy) |
| 9 | No hot-path DB indexes beyond a few | P2 | Open | Fine at low data volume | frontend/Supabase |
| 10 | Payments/Billing is UI-only | P2 | Open (blocked) | N/A | owner (payment processor) |
| 11 | Notifications & Messaging modules not implemented | P2 | Open | N/A | frontend + providers |
| 12 | Telehealth is a UI shell (no signaling) | P2 | Open (blocked) | N/A | infra (real-time) |
| 13 | Coverage instrumentation not configured | P3 | Open | Count tests manually | either lane |
| 14 | No audit-log writes on most mutations | P2 | Open | N/A | frontend/Supabase |
| 15 | terraform provisions Cloud SQL, duplicating Supabase | P2 | Open | Don't apply terraform as-is | owner (decision) |

## Environment / operational notes (not repo bugs)

- **Local Docker (Colima) can fill its VM disk** after many image builds,
  producing `input/output` / `ENOSPC` errors. Prune build cache
  (`docker builder prune -af`); do **not** restart a Colima VM shared with a
  running Supabase stack. CI (GitHub Actions) is the authoritative Docker
  verifier and is unaffected.

## Explicitly NOT bugs (by design)

- AI endpoints returning canned data without `GEMINI_API_KEY` — intentional demo
  fallback.
- Removed `/api/{auth,appointments,billing,graphql,…}` endpoints — deliberately
  deleted (were fabricated stubs); the client uses Supabase directly.
