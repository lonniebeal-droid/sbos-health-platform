# IMPLEMENTATION STATUS — SBOS HealthOS

Per-module status, mapped to **actual files**. "Progress %" is an estimate of
how complete the module is relative to a production MVP, judged from the code
present. Status vocabulary:

- **Implemented** — code present and (where noted) tested/built.
- **Partial** — meaningful code exists but core pieces are missing or unverified.
- **Scaffold** — UI/shell present, not wired to real behavior.
- **Not implemented** — no code found in the repo.

> Caveat: deep end-to-end behavior of the frontend portals has not been
> independently verified against a running Supabase instance in this audit;
> statuses reflect code presence + the tests/builds that exist.

---

## Authentication
- **Status:** Implemented (unverified against hosted infra)
- **Progress:** 75%
- **Files:** `src/components/auth/LoginScreen.tsx`, `src/lib/services/authService.ts`, `src/lib/authContext.tsx`, `supabase/migrations/20260725000000_auth_integration_rls.sql`
- **Features:** Supabase Auth (`signInWithPassword`), profile provisioning via `handle_new_user` trigger, `public.users` linked to `auth.users`, RLS helpers `current_user_role()` / `current_user_org_id()`.
- **Remaining work:** MFA; verify end-to-end sign-in against hosted Supabase; session-refresh hardening.
- **Dependencies:** Supabase (hosted for prod).
- **Last updated:** 2026-07-25

## Patient Portal
- **Status:** Partial → Implemented (UI-rich)
- **Progress:** 65%
- **Files:** `src/components/patient/*` — `PatientDashboard`, `BenefitsExplainer`, `BillPayment`, `ClaimsTracker`, `InsuranceCardModal`, `MedicalRecordsView`, `PrescriptionsView`, `ProviderSearch`, `TelehealthRoom`
- **Features:** dashboard, benefits, bill view, claims tracking, medical records, prescriptions, provider search, telehealth shell. Several wired to live data (claims, medical records, benefits).
- **Remaining work:** confirm every view against live RLS data; payments are UI-only (no processor).
- **Dependencies:** Supabase; payment processor (blocked).
- **Last updated:** 2026-07-25

## Provider Portal
- **Status:** Partial
- **Progress:** 55%
- **Files:** `src/components/provider/*` — `ProviderDashboard`, `PatientManagement`, `ClinicalDocumentation`, `AIClinicalAssistant`
- **Features:** provider dashboard, patient management, clinical documentation, AI clinical assistant (calls `/api/ai/clinical-notes`).
- **Remaining work:** verify write paths against RLS; broaden clinical workflows.
- **Dependencies:** Supabase; Gemini key for live AI.
- **Last updated:** 2026-07-25

## Employer Portal
- **Status:** Scaffold → Partial
- **Progress:** 40%
- **Files:** `src/components/employer/EmployerPortal.tsx`
- **Features:** single portal entry; benefits-oriented.
- **Remaining work:** enrollment, plan comparison, population views.
- **Dependencies:** Supabase; `benefits_plans` data.
- **Last updated:** 2026-07-25

## Admin Portal
- **Status:** Partial
- **Progress:** 45%
- **Files:** `src/components/admin/AdminPortal.tsx`, `src/components/admin/TenantManagement.tsx`
- **Features:** admin entry, tenant (organization) management.
- **Remaining work:** user management, feature flags, system health surfacing.
- **Dependencies:** Supabase; admin RLS.
- **Last updated:** 2026-07-25

## Claims
- **Status:** Implemented (data + UI)
- **Progress:** 60%
- **Files:** `src/components/patient/ClaimsTracker.tsx`, `src/components/insurance/InsuranceClaimsCenter.tsx`, `claims` table + `claims_visibility` RLS, `repositories.claims`, `mappers`
- **Features:** claims model (ICD-10/CPT, amounts, status, AI risk fields), payer + patient views, payer-scoped RLS plus patient/provider visibility.
- **Remaining work:** adjudication workflow; clearinghouse integration (blocked).
- **Dependencies:** clearinghouse creds (blocked).
- **Last updated:** 2026-07-25

## Billing
- **Status:** Scaffold (UI only)
- **Progress:** 25%
- **Files:** `src/components/patient/BillPayment.tsx`
- **Features:** bill payment UI.
- **Remaining work:** real payment processing, invoices, ledgers — none present.
- **Dependencies:** payment processor (Stripe or similar) — **blocked**.
- **Last updated:** 2026-07-25

## Scheduling
- **Status:** Partial (data model only)
- **Progress:** 35%
- **Files:** `appointments` table + `repositories.appointments`; `src/components/patient/ProviderSearch.tsx`
- **Features:** appointment data model (type/status/scheduled_at/telehealth URL); provider search.
- **Remaining work:** availability, recurrence, conflict detection, booking UI — not present.
- **Dependencies:** Supabase.
- **Last updated:** 2026-07-25

## Clinical Documentation
- **Status:** Implemented (AI-assisted)
- **Progress:** 55%
- **Files:** `src/components/provider/ClinicalDocumentation.tsx`, `AIClinicalAssistant.tsx`, backend `/api/ai/clinical-notes`
- **Features:** BIRP-style note drafting via Gemini (with demo fallback); ICD/CPT suggestions.
- **Remaining work:** persistence/versioning of notes; sign/co-sign workflow.
- **Dependencies:** Gemini key; Supabase persistence.
- **Last updated:** 2026-07-25

## Jessie AI
- **Status:** Implemented (backend)
- **Progress:** 70%
- **Files:** `server.ts` `/api/ai/chat|clinical-notes|fraud-analysis`; `src/components/common/AIAssistantWidget.tsx`, `provider/AIClinicalAssistant.tsx`
- **Features:** conversational assistant (context-aware system prompts), clinical notes, fraud/FWA triage; memoized client, upstream timeout, rate limiting, demo fallback. **Verified:** unit tests for client + JSON parsing; container smoke tests.
- **Remaining work:** **authentication** on endpoints (blocked); persistence of conversations.
- **Dependencies:** `GEMINI_API_KEY`; Supabase JWT secret for auth.
- **Last updated:** 2026-07-25

## Telehealth
- **Status:** Scaffold
- **Progress:** 20%
- **Files:** `src/components/patient/TelehealthRoom.tsx`; `appointments.telehealth_room_url`; `metadata.json` requests camera/microphone.
- **Features:** telehealth room UI shell.
- **Remaining work:** signaling server, WebRTC session management, recording — none present.
- **Dependencies:** real-time infra (blocked).
- **Last updated:** 2026-07-25

## Messaging
- **Status:** Not implemented
- **Progress:** 0%
- **Files:** none found.
- **Remaining work:** entire feature (threads, participants, persistence).
- **Last updated:** 2026-07-25

## Notifications
- **Status:** Not implemented
- **Progress:** 0%
- **Files:** none found (no SMS/email integration; the previous fake stubs were removed).
- **Dependencies:** Twilio/Resend or similar (blocked).
- **Last updated:** 2026-07-25

## Revenue Cycle (RCM)
- **Status:** Partial (UI shells)
- **Progress:** 35%
- **Files:** `src/components/rcm/*` — `EligibilityVerifier`, `ElectronicPrescribing`, `LabIntegrationHub`, `PriorAuthEngine`; `prior_authorizations` table + `repositories.priorAuths`
- **Features:** prior-auth data model + engine UI; eligibility/e-prescribe/lab UIs.
- **Remaining work:** external integrations (payer eligibility, e-prescribe network, lab HL7/LOINC feeds) — all need credentialed third parties.
- **Dependencies:** external clearinghouse/e-prescribe/lab (blocked).
- **Last updated:** 2026-07-25

## Insurance / Payer
- **Status:** Partial
- **Progress:** 50%
- **Files:** `src/components/insurance/InsuranceHub.tsx`, `InsuranceClaimsCenter.tsx`; `benefits_plans` table; `claims` table
- **Features:** payer hub, claims center, benefits plans.
- **Remaining work:** adjudication, EOB/ERA, network management.
- **Last updated:** 2026-07-25

## RBAC
- **Status:** Implemented (tested)
- **Progress:** 70%
- **Files:** `src/lib/permissions.ts` (**14 unit tests**); RLS role scoping via `current_user_role()`.
- **Features:** role matrix (patient/provider/insurance/employer/admin), client-side gates, DB-level role scoping.
- **Remaining work:** confirm parity between client gates and RLS for every table.
- **Last updated:** 2026-07-25

## Audit Logging
- **Status:** Partial (data model + repo)
- **Progress:** 40%
- **Files:** `audit_logs` table; `repositories.auditLogs`.
- **Features:** audit record model (actor/action/resource/ip/timestamp) and accessor.
- **Remaining work:** systematic write coverage across mutations; an audit viewer; tamper-resistance.
- **Last updated:** 2026-07-25

## Reporting
- **Status:** Not implemented (as a distinct module)
- **Progress:** 10%
- **Files:** none dedicated; dashboards surface some counts.
- **Remaining work:** reporting/analytics module, aggregation queries, exports.
- **Last updated:** 2026-07-25
