# SBOS Health Platform — Production Readiness Report

**Status:** 🔴 **NOT production ready.** This is a front-end prototype on a fully mocked backend.
**Last verified:** 2026-07-24 (against the actual codebase, by direct file inspection + `tsc --noEmit`).
**Maintenance:** This is a living document. Update the status of any row when its
implementation changes. Every claim here must be verifiable in the code.

> Legend — **✅ Real:** implemented and working · **🟡 Mocked:** UI/endpoint exists
> but returns hardcoded/fake data · **⚪ Planned:** not implemented · **🔴 Broken:**
> present but does not work.

---

## 1. Executive Summary

SBOS compiles cleanly (`tsc --noEmit` passes) and runs at `http://localhost:3000`.
The React UI is well-built. **Everything behind the UI is mocked.** There is no
database connection, no authentication, no persistence, and no real third-party
integration. Do not deploy this to handle real users or any PHI.

**Rough completion: ~15%** — essentially the presentation layer plus an unused SQL
schema. Making this production-ready requires building the backend, not swapping data.

---

## 2. Readiness Matrix (verified)

| Component | Status | Evidence / Reality |
|---|---|---|
| Front-end UI (all 5 role portals) | ✅ Real | Renders and navigates. Data is mock. |
| TypeScript build (`tsc --noEmit`) | ✅ Real | Passes with 0 errors. |
| Domain type model (`src/types.ts`) | ✅ Real | Thorough, usable. |
| RBAC permission function (`src/lib/permissions.ts`) | 🟡 Mocked | Real pure function + real unit test, but **not enforced** on any route or UI action. |
| Authentication / sessions / MFA | ⚪ Planned | `/api/auth/login` ignores password, returns fake token. Front end never calls it; role chosen via dropdown. |
| Database / persistence | ⚪ Planned | No DB connection anywhere. `@supabase/supabase-js` installed, **never imported**. |
| SQL schema (`supabase/migrations/`) | 🔴 Broken | Two **conflicting** schemas (see §3). Never applied by the app. |
| Multi-tenant isolation (RLS) | 🔴 Broken | Policies exist but use `OR TRUE`, so they permit everything. Most tables have no RLS at all. |
| Appointments (`/api/appointments*`) | 🟡 Mocked | Returns hardcoded appointments; `book` echoes input. Nothing stored. |
| Patient messaging (`/api/messages*`) | 🟡 Mocked | Hardcoded message; `send` returns fake id. |
| WebRTC telehealth (`/api/telehealth/*`) | 🟡 Mocked | Returns fake room ids/tokens. No signaling server, no sockets. |
| Stripe billing (`/api/billing/*`) | 🟡 Mocked | Returns fake `checkout.stripe.com` URLs. No Stripe SDK, no keys, no webhook verification. |
| Twilio SMS / SendGrid email (`/api/notifications/*`) | 🟡 Mocked | Returns fake SIDs/ids. Neither SDK is installed. |
| Secure storage / encryption (`/api/storage/upload`) | 🟡 Mocked | Returns a URL and the literal string `"AES-256-GCM"`. No upload, no encryption. |
| HIPAA audit logging (`/api/audit/*`) | 🟡 Mocked | Returns `hipaaVerified:true`. Nothing is written anywhere. |
| Analytics (`/api/analytics/dashboard`) | 🟡 Mocked | Hardcoded numbers. |
| GraphQL (`/api/graphql`) | 🟡 Mocked | Ignores the query, returns one hardcoded object. |
| Gemini AI endpoints (`/api/ai/*`) | ✅ Real* | Real Gemini integration. Model is now configurable via `GEMINI_MODEL` (was a hardcoded non-existent model). *Requires a valid `GEMINI_API_KEY`; falls back to canned text without one. |
| OpenAPI spec (`docs/openapi.json`) | 🟡 Mocked | 87-line partial stub; does not describe all endpoints. |
| Automated tests | 🔴 Broken | Only `permissions.test.ts` asserts. `api.test.ts` prints "PASSED" unconditionally. No test runner, no `test` script. |
| CI (`.github/workflows/`) | 🔴 Broken | Two workflow files; one has a corrupted step (`actions/node-清新@v3`) that will fail. Neither runs tests. |
| Dockerfile / docker-compose | 🟡 Mocked | Files are plausible but unvalidated; app they run is still mocked. |
| Terraform (`terraform/`) | ⚪ Planned | Provisions GCP Cloud SQL + Cloud Run (not Supabase — inconsistent). Never applied. |
| `scripts/deploy.sh` | 🔴 Broken | Step 3 only `echo`s "Migrations applied"; it applies nothing. |

---

## 3. Blocking Issues Before Any Real Deployment

1. **No authentication.** Anyone is any role. Must implement real auth + sessions.
2. **No persistence.** All state is hardcoded server literals; nothing survives a request.
3. **Two conflicting DB schemas.** `20260724_init_sbos_schema.sql` (tables `tenants`,
   `profiles`, …) vs `20260724000000_enterprise_schema.sql` (tables `organizations`,
   `users`, `patients`, …). Pick one canonical schema.
4. **RLS is non-functional.** `USING (... OR TRUE)` disables isolation; most tables
   lack RLS entirely.
5. **No security controls.** No encryption, no audit logging, no input validation,
   no rate limiting (see `SECURITY_AUDIT.md`).
6. **HIPAA:** none of the Security Rule controls exist yet, and no BAA-covered
   infrastructure is in place. Do not put PHI anywhere until this is real.

---

## 4. Path to Readiness

See the roadmap in `AUDIT_REAL.md` §6. In short: build real auth + a single canonical
database + working RLS first (nothing else can be trusted until then), then replace
mocks domain by domain, then add security/compliance hardening last.
