# SECURITY — SBOS HealthOS

Honest security posture. This system is **not yet cleared for real PHI**. See
also the repo-root [`SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

## HIPAA readiness checklist (current state)

| Control | State | Notes |
| ------- | ----- | ----- |
| Signed BAA (hosting + model provider) | ❌ | Required before any real PHI. Business/legal. |
| Access control (authN) | 🟡 | Supabase Auth for the app; AI endpoints unauthenticated. |
| Access control (authZ) | 🟡 | Postgres RLS is live on all 21 tables. The exact 18-entry historical migration ledger plus a forward local grants migration now reset, seed, and pass all 18 RLS checks locally. The grants tightening is source-only until normal hosted deployment review. Patient-self-service checks still cannot be satisfied because no signup flow links a `patients` row to `auth.uid()`. |
| Encryption in transit | 🟡 | HSTS set in prod; TLS terminated by the host (not provisioned). |
| Encryption at rest | ⛔ | Provided by hosted Supabase once provisioned. |
| Audit logging | 🟡 | `audit_logs` table + repo; not written on all mutations. |
| Secrets management | ❌ | Secrets via env today; Secret Manager not wired. |
| Minimum necessary / least privilege | 🟡 | CI token least-privilege; app roles modeled. |
| Transmission to third parties (Gemini) | ⛔ | Needs DPA/BAA with model provider before PHI. |

Legend: ✅ done · 🟡 partial · ❌ missing · ⛔ blocked on infra/business.

## What is implemented (verified)

- **HTTP hardening** (`server.ts`): `x-powered-by` disabled; `trust proxy` 1;
  `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`,
  `X-DNS-Prefetch-Control`, `Cross-Origin-Opener-Policy`, and HSTS in production.
- **Rate limiting**: per-IP fixed window (`/api` 120/min, `/api/ai` 15/min).
- **Body size cap**: 256 kb, with correct `413` handling.
- **Error hygiene**: generic client-facing messages; internal detail logged
  server-side only; correct 4xx vs 5xx status codes.
- **Tenant isolation + per-role write RBAC**: RLS enabled on all 21 tables,
  keyed on `current_user_org_id()`/`current_user_role()`. Write policies are
  grounded in the app's actual write paths (see
  `supabase/migrations/20260821183723_per_role_write_rbac.sql`), not
  invented from scratch — e.g. only providers/coders/admin can write
  clinical documentation, only billers/coders/admin/insurance can write
  claims. The exact 18-entry historical ledger plus a forward grants
  migration now rebuild, seed, and pass `scripts/verify-rls.sh` locally.
  The grants migration is staged for normal hosted deployment review; this
  local result does not assert the hosted privilege matrix has changed.
- **Profile provisioning**: signup metadata cannot select a tenant or privileged
  role. New profiles are unassigned `patient` records until a trusted
  administrative path assigns access (not built yet); client self-service
  updates are limited to `full_name` (no `phone` column exists on `users` —
  that field lives on `patients`). A deactivated account (`is_active = false`)
  fails every RLS check even with a still-valid session.
- **Secret hygiene in repo**: no service-role key in client code; terraform DB
  password removed from the tree; `.env`/tfvars gitignored.
- **CI**: least-privilege `GITHUB_TOKEN` (`contents: read`); `npm audit` = 0
  vulnerabilities; Node 22 LTS (supported runtime).

## Threat model (abbreviated)

| Asset | Threat | Mitigation | Residual risk |
| ----- | ------ | ---------- | ------------- |
| PHI in Postgres | Cross-tenant read or self-assigned privilege | RLS by org/role on all tables + per-role write RBAC + restricted profile writes | Patient self-service ownership checks unsatisfiable until a registration flow links `patients.user_id` → **medium** |
| AI endpoints | Abuse / cost / prompt injection | Rate limit + input caps | Unauthenticated → **medium/high** |
| Request bodies | Oversized/malformed DoS | 256kb cap + correct 4xx | Low |
| Secrets | Leak via repo/image | gitignore + dev deps pruned from image | Historical terraform pwd in git history → **medium** |
| Transport | MITM | HSTS + host TLS | TLS not provisioned yet → **medium** |

## Current top risks

1. **Unauthenticated `/api/ai/*`** — add Supabase-JWT verification (blocked on
   the JWT secret).
2. **Historical terraform DB password in git history** — must be **rotated**.
3. **No CSP** — author against the SPA's real needs (Supabase, Gemini, WebRTC).
4. **No patient self-service registration flow** — `patients.user_id` is never set by any signup path today, so the patient-ownership RLS checks (appointment booking, prescription refill) can't be satisfied by a real patient-role account yet.
5. **In-memory rate limiter** — bypassable across multiple instances (needs Redis).

## Required before production with PHI

- Signed BAA (host + model provider); hosted Supabase.
- Auth on AI endpoints; MFA.
- Secret Manager; rotate the historical password.
- Patient self-service registration flow (links `patients.user_id`); deploy and
  verify the grants-alignment migration through the normal hosted change path;
  systematic audit logging; CSP; TLS/DNS.
