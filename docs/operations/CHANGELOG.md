# SBOS HealthOS — Changelog

Completed milestones, grouped by date. Frontend + Supabase lane
(`frontend-ehr-2`) unless noted.

## 2026-07-25
### Engineering Operations Manual
- Added `docs/operations/*` (15 living documents): project status, executive
  summary, architecture (+Mermaid), implementation status, roadmap, database, API,
  AI, security, testing, dev setup, known issues, decisions, operations, changelog.

### Secure Messaging (P1)
- `message_threads` / `thread_participants` / `messages` / `message_attachments`
  with participant-based RLS (`is_thread_participant` definer helper) +
  `create_message_thread` RPC.
- `messagingService`, mappers (unread via `last_read_at`), `MessagingCenter` UI
  (inbox, thread view, compose, recipient picker, unread badges) in patient +
  provider dashboards. MESSAGE_SENT audit logging. (55 tests.)

### Clinical Platform (P4 core)
- `clinical_notes` (BIRP/SOAP/progress), `treatment_plans`, `assessments` tables +
  RLS; `clinicalNotesService` persists signed BIRP notes; ClinicalDocumentation
  signs + saves. Real **audit logging** on note sign.

### Revenue Cycle (P3)
- Claims lifecycle: payment posting + denials; **billing dashboard**.
- **Eligibility 270/271** via `check_eligibility` SECURITY DEFINER RPC
  (controlled cross-org lookup).

### Environment
- Disabled Supabase Storage + analytics locally (Colima container health); freed
  regenerable dev caches after host disk filled.

## 2026-07-24
### Employer & Admin
- Employer portal on live data (`employer_groups` + `employer_members`).
- Tenant management: org white-label settings + tenant-admin self-service edit.
- Admin HIPAA audit trail reads real data.

### Core EHR on live data
- Provider directory; patient self-profile + vitals; appointments; prescriptions
  (+refill); medical records; benefits; claims (patient/provider/payer + RLS).

### Foundations
- Local Supabase (Colima) + canonical schema; Supabase Auth + real per-tenant RLS;
  typed data layer (db types → mappers → repositories → services → `useAsync`);
  real login flow; org context; Vitest suite; honest audit of the prior prototype.

_(Backend/infra lane — server hardening, CI, OpenAPI, Docker — is tracked
separately on `phase-0-foundations`.)_
