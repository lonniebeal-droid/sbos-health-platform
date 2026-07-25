# SBOS HealthOS — Security

> **Status: NOT HIPAA-compliant / not production.** Local development only. No
> signed BAA, no hosted infra, no real PHI permitted. This documents the security
> posture and gaps honestly.

## Access control (implemented)
- **Auth:** Supabase Auth (JWT). Passwords only in `auth.users`. `public.users`
  is a linked profile with role + organization_id.
- **RBAC:** role matrix in `lib/permissions.ts` (unit-tested) + role checks in RLS
  via `current_user_role()`.
- **RLS (the primary boundary):** every tenant table enforces
  `organization_id = current_user_org_id()`; PHI tables add patient-self read.
  Cross-org access only via audited SECURITY DEFINER RPCs (`check_eligibility`,
  messaging helpers). Verified per-role for prior verticals via signed-in queries
  (messaging re-check pending local DB recovery).

## Audit logging (partial)
- Immutable `audit_logs`; written on **clinical-note sign** and **message-send**
  (actor + org + resource). Admin console renders the org trail.
- **Gap:** PHI *reads* are not yet logged; no DB triggers for comprehensive
  coverage. Planned in Phase 5.

## Encryption
- **In transit:** Supabase/PostgREST over HTTPS in hosted deployments (local dev
  is plain HTTP on loopback).
- **At rest:** provided by the (future) hosted Postgres. No app-level field
  encryption yet.
- **Secrets:** `GEMINI_API_KEY` server-side only; Supabase anon key is public by
  design (RLS protects data); service-role key must stay server-side (not used by
  the browser).

## HIPAA checklist (target vs. current)
| Control | Status |
|---|---|
| Access control / unique user IDs | ✅ (Supabase Auth) |
| Role-based authorization | ✅ RBAC + RLS |
| Tenant isolation | ✅ RLS per org |
| Audit controls | 🔶 partial (writes only) |
| Transmission security (TLS) | 🔶 hosted only |
| Encryption at rest | 🔶 hosted only |
| Business Associate Agreement | 🔴 not signed (owner) |
| Storage of documents (BAA-covered) | 🔴 not configured |
| MFA | 🔴 not enabled |
| Backup / disaster recovery | 🔴 not configured |
| Penetration test / review | 🔴 not done |

## Threat model (summary)
- **Cross-tenant data access** → mitigated by RLS + org helper; RPCs are the only
  cross-org path and are role-gated. Highest-value area to keep reviewing.
- **Privilege escalation** → role comes from `public.users` (not client-set);
  updates to own profile only; org writes restricted.
- **Key leakage** → anon key public (safe w/ RLS); service-role must never ship to
  the client; AI key server-side.
- **Injection** → PostgREST parameterizes; RPCs use typed args. Add explicit input
  validation on write services (Phase 5).

## Current risks / must-do before production
1. Sign a **BAA** and move to hosted HIPAA-eligible Supabase; enable TLS + at-rest.
2. Expand audit logging to reads; add triggers.
3. Enable MFA; add password reset.
4. Add input validation + rate limiting on all write paths.
5. Independent security review / pen test.
6. Rotate any secrets that ever touched git history (see backend lane notes).
