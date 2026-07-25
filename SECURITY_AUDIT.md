# SBOS Health Platform — Security Audit

**Status:** 🔴 **No effective security controls are implemented.**
**Last verified:** 2026-07-24 (direct source inspection).
**Maintenance:** Living document. As controls are built, move items from
"Not implemented" to "Implemented" **only after** verifying them in code.

> ⚠️ This platform is **not HIPAA compliant** and must not store, process, or
> transmit real Protected Health Information (PHI) in its current state. There is
> no signed BAA-covered infrastructure and none of the HIPAA Security Rule
> technical safeguards below are implemented.

---

## 1. Authentication & Authorization

| Control | Status | Reality |
|---|---|---|
| User authentication | 🔴 Not implemented | `/api/auth/login` (`server.ts`) accepts any email, **never checks the password**, and returns `sbos_jwt_token_<base64(email)>_<timestamp>` — not a real signed JWT. |
| Session verification | 🔴 Not implemented | `/api/auth/me` returns a hardcoded user regardless of any token. No route verifies auth. |
| MFA | 🔴 Not implemented | Login response sets `mfaVerified:true` as a literal. No MFA exists. |
| RBAC enforcement | 🔴 Not implemented | `src/lib/permissions.ts` defines a correct matrix, but it is **never called** by any route or UI guard. The front end selects roles via a dropdown. |
| Front-end auth | 🔴 Not implemented | No login screen, no token storage, no auth context. |

## 2. Multi-Tenant Isolation (RLS)

| Control | Status | Reality |
|---|---|---|
| Row-Level Security | 🔴 Broken | Enabled on only 4 of 12 tables (`organizations`, `patients`, `claims`, `audit_logs`). Policies use `USING (id = auth.uid() OR TRUE)` — the `OR TRUE` makes them **always allow**, so there is no isolation. |
| Tenant context propagation | 🔴 Not implemented | The app sends no auth/tenant claims to any DB (there is no DB connection at all), so even correct RLS would be inert. |

## 3. PHI Protection (Encryption / Storage)

| Control | Status | Reality |
|---|---|---|
| Encryption at rest | 🔴 Not implemented | `/api/storage/upload` returns the string `encryption: "AES-256-GCM"`. No file is uploaded and nothing is encrypted. |
| Encryption in transit | ⚪ Not configured | Dev server is plain HTTP on `0.0.0.0:3000`. No TLS termination is configured in-app. |
| Field-level PHI encryption | 🔴 Not implemented | None. |

## 4. Audit Logging

| Control | Status | Reality |
|---|---|---|
| Immutable audit trail | 🔴 Not implemented | `/api/audit/record` returns `hipaaVerified:true` but writes nothing. `/api/audit/logs` returns two hardcoded rows. The `audit_logs` table exists in SQL but is never written to. |
| Actor / IP / resource capture | 🔴 Not implemented | Not captured anywhere. |

## 5. Application-Layer Hardening

| Control | Status | Reality |
|---|---|---|
| Input validation / sanitization | 🔴 Not implemented | Endpoints read `req.body` fields directly with no validation. |
| Rate limiting / brute-force protection | 🔴 Not implemented | None. |
| CORS / security headers (helmet, CSP) | 🔴 Not implemented | None configured. |
| Secrets management | 🟡 Partial | `GEMINI_API_KEY`/`GEMINI_MODEL` read from env server-side (good — not exposed to the client bundle). But the model assumes AI Studio auto-injection; no real secret strategy for other services (none integrated yet). |
| Dependency vulnerability scanning | ⚪ Not configured | Not in CI. |

## 6. Notes on the SQL Schema

- `users.password_hash` exists in `20260724000000_enterprise_schema.sql`, but the
  login flow never hashes or verifies passwords. If auth is built on Supabase Auth,
  decide whether this column is even used.
- Two conflicting schemas exist (see `CODE_AUDIT.md` §4); the security posture of
  whichever becomes canonical must be re-audited.

## 7. Required Before Handling Real PHI (not yet started)

1. Real authentication + session verification + MFA.
2. Functional RLS on **all** tenant-scoped tables (remove `OR TRUE`; add missing policies).
3. Real, append-only audit logging with actor/IP/resource/timestamp.
4. Encryption in transit (TLS) and at rest for PHI.
5. Input validation, rate limiting, security headers.
6. HIPAA-eligible hosting with a signed Business Associate Agreement (BAA).
7. Independent security review / penetration test.
