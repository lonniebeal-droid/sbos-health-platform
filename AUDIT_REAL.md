# SBOS Health Platform — Ground-Truth Audit

**Date:** 2026-07-24
**Auditor:** Claude (development handoff)
**Method:** Direct source inspection of every file in `server.ts`, `src/`, `supabase/`, `terraform/`, plus a clean `tsc --noEmit` build.

> **This document supersedes** `PRODUCTION_READINESS_REPORT.md`, `CODE_AUDIT.md`,
> `SECURITY_AUDIT.md`, and `TECH_DEBT.md`. Those four files are **inaccurate**. They
> describe a system that does not exist in this codebase (see §5). Treat them as
> aspirational marketing copy, not engineering records.

---

## 1. Executive Summary

SBOS is currently a **polished front-end prototype with a fully mocked backend.**
It compiles cleanly, runs on `http://localhost:3000`, and the UI is genuinely good.
But nothing behind the UI is real:

- **The backend (`server.ts`) contains zero persistence.** Every one of its ~24
  endpoints returns hardcoded JSON literals. There is no database connection —
  `@supabase/supabase-js` is installed but **never imported or called anywhere**.
- **Authentication does not exist.** `/api/auth/login` accepts any email, ignores
  the password entirely, and returns a fake base64 string it calls a "JWT". The
  front end never even calls it — you pick your role from a dropdown.
- **The SQL schema is real and reasonable, but orphaned.** `supabase/migrations/`
  defines sensible multi-tenant tables with RLS, but no code in the app ever
  connects to a Postgres instance or runs against them.
- **~21 of 24 components render static mock objects** imported directly from
  `src/data/mockData.ts` / `mockTenants.ts`. The 7 that call `fetch()` only hit
  the mock endpoints above (or Gemini).
- **The compliance and test reports are fabricated** (§5). This is the most
  important finding: for a HIPAA product, documentation claiming controls that
  don't exist is a liability, not an asset.

**Honest completion estimate:** this is ~15% of a production EHR — essentially the
presentation layer. The premise in the handoff ("just swap mock data for real
implementations") understates the work: **there is no backend to swap to yet — it
has to be built.**

---

## 2. Current Architecture (as actually built)

```
Browser (React 19 SPA)
   │  role & tenant chosen via <Header> dropdowns (no login)
   │  components import mock objects directly  ── src/data/mockData.ts
   │  7 components fetch() ──────────────────┐
   ▼                                         ▼
Express server (server.ts, port 3000)   /api/ai/*  → Google Gemini (real call,
   │  serves Vite SPA in dev                          but broken model name — §4)
   │  ~24 REST + 1 GraphQL endpoint
   ▼
   returns hardcoded JS object literals   ← NO DATABASE. NO SUPABASE CLIENT.
                                            NO AUTH VERIFICATION. NO PERSISTENCE.

supabase/migrations/*.sql   ← real schema, never connected to anything
terraform/*.tf             ← IaC stubs, never applied
```

- **Frontend:** React 19 + Vite 6 + Tailwind v4 + lucide-react + `motion`. Clean,
  typed (`src/types.ts` is thorough), organized by role
  (patient / provider / insurance / employer / admin) plus an `rcm/` group.
- **State:** Local `useState` only. `OrgProvider` (`src/lib/organizationContext.tsx`)
  is a thin context. No data-fetching library, no cache, no auth context.
- **Backend:** A single `server.ts` file. Dev mode mounts Vite as middleware.
- **Origin:** This is a **Google AI Studio "applet" export** (see `.env.example`
  references to AI Studio secret injection; `package.json` name is `react-example`).
  That explains the shape: great UI scaffold, stubbed everything else.

---

## 3. Module Status Matrix

Legend: **Complete** = real & works · **Partial** = real UI, fake data ·
**Missing** = claimed but absent · **Broken** = present but doesn't work.

| Area | Status | Reality |
|---|---|---|
| UI component library & layout | **Complete** | Well-built, typed, responsive, dark mode. |
| TypeScript domain model (`types.ts`) | **Complete** | Thorough and usable as-is. |
| RBAC permission matrix (`lib/permissions.ts`) | **Partial** | Real pure function + real unit test, but **never enforced** on any route or in the UI. |
| SQL schema (`supabase/migrations`) | **Partial** | Good schema; **never applied or connected**. |
| Patient / Provider / Insurance / Employer / Admin dashboards | **Partial** | Render mock data (`samplePatient`, `sampleClaims`, etc.). |
| Gemini AI endpoints (chat, BIRP notes, fraud) | **Broken** | Real integration code, but hardcoded model `gemini-3.6-flash` does not exist → every real call errors (§4). Falls back to canned text. |
| Authentication / sessions / MFA | **Missing** | No verification, no Supabase Auth, front end never logs in. |
| Multi-tenant isolation (RLS enforcement) | **Missing** | Schema has RLS; app sends no auth context, so it's inert. |
| Appointments / messaging / claims persistence | **Missing** | Endpoints return literals; nothing is stored or retrieved. |
| WebRTC telehealth | **Missing** | `/api/telehealth/*` returns fake room IDs & tokens; no signaling server, no socket. |
| Stripe billing | **Missing** | Returns fake `checkout.stripe.com` URLs; no Stripe SDK, no keys, no webhook verification. |
| Twilio SMS / SendGrid email | **Missing** | Returns fake SIDs/message IDs; neither SDK is installed. |
| Secure storage / encryption | **Missing** | `/api/storage/upload` returns a URL and the string `"AES-256-GCM"`; no upload, no encryption occurs. |
| HIPAA audit logging | **Missing** | `/api/audit/record` returns `hipaaVerified:true`; nothing is written anywhere. |
| Test suite | **Broken/Fabricated** | Only `permissions.test.ts` runs real assertions. `api.test.ts` `console.log`s "PASSED" for 7 subsystems unconditionally. No test runner, no `test` script, no coverage tooling. |
| CI/CD (`.github/workflows`) | **Partial** | Present; not validated against real infra. |

---

## 4. The "current Gemini error" — two bugs, not one

The handoff says the Gemini error is *only* the placeholder API key. That's half
of it. Even with a valid key, all three AI endpoints call:

```ts
model: 'gemini-3.6-flash'   // does not exist → 404 from the API
```

So: (1) set a real `GEMINI_API_KEY`, **and** (2) use a model that exists. This
audit makes the model configurable via `GEMINI_MODEL` (default `gemini-2.0-flash`)
so it can be corrected without code changes — **verify the exact model available
on your Google account/SDK version before relying on it.**

---

## 5. Fabricated documentation (must-read)

The pre-existing reports assert controls that are absent from the code:

- `SECURITY_AUDIT.md`: claims "TLS 1.3 enforcement," "AES-256-GCM envelope
  encryption," and a "synchronous audit log on every PHI access capturing actor
  NPI + verified client IP." **None of this exists.** The storage endpoint
  encrypts nothing; the audit endpoint logs nothing.
- `PRODUCTION_READINESS_REPORT.md`: marks Auth/RBAC, RLS, WebRTC, Stripe, Twilio,
  audit logging all "✅ Production Ready." **All are mocked.**
- Both `CODE_AUDIT.md` and `api.test.ts` claim ~98–100% test coverage. **Real
  automated coverage is ~0%** (one unit test, no runner).

For a behavioral-health EHR handling PHI, shipping — or fundraising/selling —
against these documents would be a serious compliance and legal exposure. They
should be deleted or rewritten to match reality. I did **not** delete them (I
didn't author them); flagging for your decision.

---

## 6. Prioritized Roadmap

Rewritten from the handoff's phases to match the true starting point. Each
milestone keeps the app runnable and is independently verifiable.

### Phase 0 — Foundations (no external accounts needed)
1. **Fix the Gemini model** (done in this pass) so AI works once a key is set.
2. **Real test runner** (Vitest) + wire the real permission tests; delete the
   fake `api.test.ts` assertions. Gives a safety net for everything below.
3. **Introduce a single API-client seam** (`src/lib/apiClient.ts`) so components
   stop importing mock objects directly. This is the seam mock→real flips through.

### Phase 1 — Real backend spine (needs a Supabase project + decisions)
4. Wire `@supabase/supabase-js` (server + client). Apply the migrations to a real
   project. **Requires HIPAA-eligible Supabase plan + signed BAA before any real
   PHI touches it.**
5. **Real authentication** via Supabase Auth (email/OTP or SSO), real sessions,
   an auth context in React, and a login screen. Remove the role dropdown.
6. **Enforce RLS + RBAC** — set tenant/user JWT claims so the existing RLS
   policies actually isolate tenants; guard every route with `permissions.ts`.

### Phase 2 — Core EHR domain (replace mocks with DB)
7. Organizations (multi-tenant), Patients, Providers, Appointments — CRUD against
   Postgres, one domain at a time, each verified end-to-end in the UI.

### Phase 3 — Clinical
8. Progress notes, BIRP notes, treatment plans, assessments (persisted), then
   AI-assisted drafting layered on top of real records.

### Phase 4 — Revenue cycle
9. Eligibility, claims, billing, employer portal — integrate real payer/clearing-
   house sandboxes; **replace fake Stripe with the real SDK + webhook signature
   verification.**

### Phase 5 — Jessie AI / voice
10. Clinical assistant + voice documentation on top of the now-real data model.

### Phase 6 — Production hardening
11. Real audit logging, encryption at rest/in transit, security review, load
    testing, HIPAA controls, deployment. Only here do compliance claims become true.

**Sequencing rule:** #4–#6 gate everything else. There is no honest way to build
Phases 2–6 on real data until a real, BAA-covered database and auth exist.

---

## 7. Technical Debt (real)

- Fabricated docs (§5) — highest priority to correct.
- `package.json` name is `react-example`, version `0.0.0`; no `test` script.
- Two package managers present (`bun.lock` **and** `package-lock.json`) — pick one.
- No env validation, no error boundaries, no logging framework, no rate limiting,
  no input validation/sanitization on any endpoint.
- Secrets model assumes AI Studio auto-injection; needs a real secret strategy.
- `server.ts` is a single 500-line file — will need to be split into routers/
  services as real logic lands.
- No `.env` schema/validation; `APP_URL` unused.
