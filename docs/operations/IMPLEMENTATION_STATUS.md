# SBOS HealthOS — Implementation Status (by module)

Status legend: **Complete** (real, works, tested) · **Partial** · **Scaffolded**
(UI/data exists, wiring incomplete) · **Blocked** (needs credentials/infra) ·
**Not started**. Last updated 2026-07-25 (`2c98ba6`).

---

### Authentication & sessions
- **Status:** Complete (local) · **Progress:** 95%
- **Files:** `lib/authContext.tsx`, `components/auth/LoginScreen.tsx`,
  `lib/services/authService.ts`, migration `..000000_auth_integration_rls`.
- **Features:** real Supabase Auth (email/password), session + profile load,
  role-gated portals, sign-out, auto profile creation trigger.
- **Remaining:** MFA (Supabase supports; not enabled); password reset UI.
- **Dependencies:** Supabase Auth.

### RBAC
- **Status:** Complete (matrix + RLS) · **Progress:** 85%
- **Files:** `lib/permissions.ts`, RLS policies across migrations.
- **Features:** role matrix (unit-tested); RLS enforces tenant + role at the DB;
  `current_user_role()` helper.
- **Remaining:** per-role write restrictions in more RLS policies; route guards.

### Patient Portal
- **Status:** Complete (core) · **Progress:** 75%
- **Files:** `components/patient/*`, `PatientDashboard.tsx`.
- **Features (live data):** dashboard, self-profile + vitals, appointments,
  prescriptions + refill, claims/EOB, benefits, medical records, provider search,
  messages.
- **Remaining:** insurance card (data exists, wire), emergency contacts, document
  uploads (Blocked: Storage), bill pay (Blocked: Stripe), profile editing UI.

### Provider Portal / Workspace
- **Status:** Partial · **Progress:** 55%
- **Files:** `components/provider/*`, `components/rcm/*`, `ProviderDashboard.tsx`.
- **Features (live):** patient directory, clinical documentation (BIRP persist),
  prior auth, messages.
- **Mock-only (verified):** `rcm/ElectronicPrescribing.tsx` (e-Rx) and
  `rcm/LabIntegrationHub.tsx` (labs) still render `data/mockData` even though the
  `prescriptions` and `lab_results` tables exist — straightforward offline wiring.
- **Remaining:** schedule management, today's appointments, caseload, tasks,
  notifications, patient timeline, clinical dashboard (Not started — net-new UI);
  wire e-Rx + labs to their tables.

### Employer Portal
- **Status:** Complete (core) · **Progress:** 80%
- **Files:** `components/employer/EmployerPortal.tsx`, migration `..060000_employer`.
- **Features (live):** employer group header, census roster, AI benefits advisor.
- **Remaining:** add/edit members UI; EDI 834 import (future).

### Admin Portal / Platform
- **Status:** Partial · **Progress:** 55%
- **Files:** `components/admin/*`, migration `..070000_org_settings`.
- **Features (live):** organization list, tenant-admin self-service settings edit,
  HIPAA audit trail view.
- **Remaining:** user management, permission management, reporting, operational
  dashboard; **provisioning new tenants + invitations (Blocked: service-role).**

### Insurance / Payer Hub
- **Status:** Complete (core) · **Progress:** 80%
- **Files:** `components/insurance/*`, `components/rcm/*`.
- **Features (live):** billing dashboard, claims adjudication (approve→payment /
  deny→reason), FWA AI, prior auth adjudication, eligibility (270/271 RPC).

### Claims / Revenue Cycle
- **Status:** Complete (core) · **Progress:** 80%
- **Files:** `components/patient/ClaimsTracker.tsx`,
  `components/insurance/InsuranceClaimsCenter.tsx`,
  `components/rcm/BillingDashboard.tsx`, migrations `..020000`, `..080000`.
- **Features (live):** patient/provider/payer claim visibility (RLS), lifecycle
  (payment posting, denials), billing aggregates, denormalized payer identity.
- **Remaining:** ERA/835 import, remittance detail, appeals workflow.

### Billing (patient bill pay)
- **Status:** Blocked · **Progress:** 20% (UI shell only)
- **Files:** `components/patient/BillPayment.tsx`.
- **Remaining:** real payment processing — **needs Stripe credentials.** Architect
  a `payments` abstraction behind a service so the provider is swappable.

### Scheduling
- **Status:** Partial · **Progress:** 45%
- **Files:** `appointments` table/repo; patient dashboard booking (optimistic).
- **Remaining:** provider schedule management, availability, persisted booking,
  reminders. Data layer exists; provider-side UI Not started.

### Clinical Documentation
- **Status:** Complete (BIRP) · **Progress:** 70%
- **Files:** `components/provider/ClinicalDocumentation.tsx`,
  `lib/services/clinicalNotesService.ts`, migration `..100000_clinical`.
- **Features (live):** AI BIRP generation, sign + persist to `clinical_notes`,
  audit log on sign; `treatment_plans` + `assessments` tables/repos/mappers.
- **Remaining:** SOAP/progress note UIs, treatment-plan + assessment UIs,
  diagnoses/care-plan management, patient chart timeline.

### Messaging
- **Status:** Complete (code) · **Progress:** 90%
- **Files:** `components/common/MessagingCenter.tsx`,
  `lib/services/messagingService.ts`, migration `..110000_messaging`.
- **Features:** threads, participant RLS, messages, read receipts (last_read_at),
  unread badges, new-thread recipient picker, MESSAGE_SENT audit.
- **Remaining:** attachments upload (Blocked: Storage); live per-role RLS re-check
  (pending local DB recovery); real-time subscriptions.

### Telehealth
- **Status:** Scaffolded · **Progress:** 25%
- **Files:** `components/patient/TelehealthRoom.tsx`; appointments carry a room URL.
- **Remaining (next milestone):** `telehealth_sessions` table, session history,
  session notes, visit linkage, waiting-room state. WebRTC is a separate concern.

### Jessie AI
- **Status:** Partial · **Progress:** 45%
- **Files:** `server.ts` `/api/ai/*` (other lane), `components/common/AIAssistantWidget.tsx`,
  AI calls in benefits/claims/clinical/prior-auth/employer components.
- **Features:** Gemini-backed BIRP generation, FWA analysis, benefits/eligibility
  explanation, employer strategy, assistant chat.
- **Remaining:** conversation persistence, real chart-context retrieval, patient
  summaries from live data, treatment recommendations, voice. See AI.md.

### Audit Logging
- **Status:** Partial · **Progress:** 50%
- **Files:** `audit_logs` table, `repositories.ts` auditLogs, admin view.
- **Features (live):** immutable rows; written on clinical-note sign and
  message-send; admin console renders org-scoped trail with actor names.
- **Remaining:** log PHI reads; DB triggers for comprehensive coverage.

### Notifications
- **Status:** Partial · **Progress:** 20%
- **Features:** unread-message badges. Header has a static notifications popover.
- **Remaining:** real notification model/table, per-user feed, delivery.

### Reporting
- **Status:** Partial · **Progress:** 20%
- **Features:** billing dashboard aggregates (claims). Admin analytics is static.
- **Remaining:** operational/clinical/financial reports over live data.
