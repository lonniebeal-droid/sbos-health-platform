# SBOS HealthOS — Roadmap

Phased plan for remaining work. Percentages are of that phase's scope.

## Phase 0 — Foundations & data layer  ·  ✅ 100%
- **Objectives:** real backend, auth, RLS, typed data layer, tests, CI.
- **Done:** Supabase local (Colima); canonical schema; auth + RLS; repository/
  mapper/service pattern; Vitest (55 tests); org context; login flow.

## Phase 1 — Core EHR workflows on live data  ·  ✅ ~95%
- **Objectives:** replace mock data with real, RLS-scoped workflows across roles.
- **Done:** patients, self-profile, prescriptions, appointments, claims + lifecycle,
  billing dashboard, prior auth, eligibility RPC, medical records, benefits,
  provider directory, admin audit trail, tenant settings, employer portal,
  clinical notes/treatment plans/assessments, secure messaging, audit logging.
- **Remaining:** patient insurance-card wiring; live per-role messaging re-check.

## Phase 2 — Telehealth & engagement  ·  🔶 ~20%
- **Objectives:** telehealth session lifecycle + patient/provider engagement.
- **Tasks:** `telehealth_sessions` table (status/started/ended, appointment link);
  session history + records; session notes linked to `clinical_notes`;
  waiting-room state; message attachments (needs Storage); notifications model.
- **Dependencies:** Supabase Storage (attachments); WebRTC provider (video) — later.

## Phase 3 — Provider workspace & admin platform  ·  🔶 ~35%
- **Objectives:** finish provider + admin operational surfaces.
- **Tasks:** schedule management, today's appointments, caseload, tasks,
  patient timeline, clinical dashboard; admin user management, permission
  management, reporting, operational dashboard.
- **Dependencies:** user provisioning/invitations need service-role (owner infra).

## Phase 4 — Jessie AI on real data  ·  🔶 ~40%
- **Objectives:** ground the assistant in the live chart.
- **Tasks:** conversation persistence (`ai_conversations`/`ai_messages`),
  chart-context retrieval, patient/chart summaries, treatment recommendations,
  documentation assistance across note types, voice workflow prep.
- **Dependencies:** `GEMINI_API_KEY` (owner); server `/api/ai/*` (backend lane).

## Phase 5 — Production hardening & deployment  ·  🔴 ~10%
- **Objectives:** make it deployable and HIPAA-defensible.
- **Tasks:** hosted Supabase (HIPAA plan) + **signed BAA**; Stripe billing; Storage
  document uploads; full RLS + audit review; input validation; component/
  integration/e2e tests; observability; CI/CD deploy; DNS/domain/secrets.
- **Dependencies (owner):** BAA, Stripe, hosting, DNS, production secrets.

## Cross-cutting technical debt (ongoing)
Rename package; converge package managers (backend lane); expand test coverage
(components/integration); consolidate the four historical org/tenant data sources;
keep docs in sync (this manual).
