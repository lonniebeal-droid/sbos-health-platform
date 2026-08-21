# SECURITY — SBOS HealthOS

Honest security posture. This system is **not yet cleared for real PHI**. See
also the repo-root [`SECURITY_AUDIT.md`](../../SECURITY_AUDIT.md).

## HIPAA readiness checklist (current state)

| Control | State | Notes |
| ------- | ----- | ----- |
| Signed BAA (hosting + model provider) | ❌ | Required before any real PHI. Business/legal. |
| Access control (authN) | 🟡 | Supabase Auth for the app; AI endpoints unauthenticated. |
| Access control (authZ) | 🟡 | Postgres RLS by org/role; seeded auth/org + patient/audit cases and profile-escalation resistance are locally verified, broader parity still pending. |
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
- **Tenant isolation**: RLS keyed on `current_user_org_id()` / role. The local
  verifier covers all 12 local public tables, provider/payer claim visibility,
  profile hardening, and append-only audit-log behavior with 32 checks.
- **Profile provisioning**: signup metadata cannot select a tenant or privileged
  role. New profiles are unassigned `patient` records until a trusted
  administrative path assigns access; client updates are limited to name/phone.
- **Secret hygiene in repo**: no service-role key in client code; terraform DB
  password removed from the tree; `.env`/tfvars gitignored.
- **CI**: least-privilege `GITHUB_TOKEN` (`contents: read`); `npm audit` = 0
  vulnerabilities; Node 22 LTS (supported runtime).

## Threat model (abbreviated)

| Asset | Threat | Mitigation | Residual risk |
| ----- | ------ | ---------- | ------------- |
| PHI in Postgres | Cross-tenant read or self-assigned privilege | RLS by org/role, restricted profile writes + local verifier | Broader table/view parity still incomplete → **medium** |
| AI endpoints | Abuse / cost / prompt injection | Rate limit + input caps | Unauthenticated → **medium/high** |
| Request bodies | Oversized/malformed DoS | 256kb cap + correct 4xx | Low |
| Secrets | Leak via repo/image | gitignore + dev deps pruned from image | Historical terraform pwd in git history → **medium** |
| Transport | MITM | HSTS + host TLS | TLS not provisioned yet → **medium** |

## Current top risks

1. **Unauthenticated `/api/ai/*`** — add Supabase-JWT verification (blocked on
   the JWT secret).
2. **Historical terraform DB password in git history** — must be **rotated**.
3. **No CSP** — author against the SPA's real needs (Supabase, Gemini, WebRTC).
4. **Hosted normalized-schema RLS parity remains unverified**, including the
   `insurance_info` benefit columns that are not in the local canonical schema.
5. **In-memory rate limiter** — bypassable across multiple instances (needs Redis).

## Required before production with PHI

- Signed BAA (host + model provider); hosted Supabase.
- Auth on AI endpoints; MFA.
- Secret Manager; rotate the historical password.
- Broader verified RLS parity across remaining tables/views; systematic audit logging; CSP; TLS/DNS.
