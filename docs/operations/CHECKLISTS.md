# SBOS HealthOS — Implementation Checklists

Concrete, verifiable steps per remaining module. Tags: **[offline]** buildable now
(local Supabase), **[cred]** needs owner credentials/infra. Follow the vertical
pattern: migration → db types → mapper (+test) → repository → service → component →
seed → RLS verify → lint/test/build → commit/push → update docs.

---

## Telehealth  [offline] (video: [cred])
- [ ] Migration `telehealth_sessions` (appointment_id FK, patient_id, provider_id,
      organization_id, status[waiting/in_progress/ended], started_at, ended_at,
      room_url, notes_id FK→clinical_notes) + org/participant RLS.
- [ ] `TelehealthSessionRow` type + `mapTelehealthSession` (+ tests).
- [ ] `telehealthSessions` repository (list, getByAppointment, create, updateStatus).
- [ ] `telehealthService`: startSession(appointmentId), setWaiting, endSession,
      history(patient/provider), linkNote(sessionId, birpNote).
- [ ] Wire `TelehealthRoom.tsx`: real session lifecycle + waiting-room state;
      "session history" list; end-of-visit → create/link clinical note.
- [ ] Seed a past + upcoming session for Sarah. Audit log on session start/end.
- [ ] [cred] Real video: integrate WebRTC/TURN provider behind a `videoService`.
- [ ] Verify RLS per role; lint/test/build; commit; update IMPLEMENTATION_STATUS.

## Secure Messaging — enhancements  [offline] (attachments upload: [cred])
- [ ] Provider↔provider + multi-recipient threads (extend new-thread picker).
- [ ] `notifications` model (see Admin/Notifications) → unread counts in header.
- [ ] Realtime updates via Supabase channels (subscribe to `messages` inserts).
- [ ] Message search / thread archive.
- [ ] [cred] Attachment upload to Supabase **Storage** → populate
      `message_attachments.storage_path`; download links.
- [ ] Tests for messagingService (send/create/markRead) with fake client.
- [ ] Live per-role RLS re-check once DB restored (currently pending).

## Jessie AI  [offline for data; live output: [cred]]
- [ ] Migration `ai_conversations` + `ai_messages` (owner + org RLS).
- [ ] `jessieService`: persist/list conversations & messages.
- [ ] `chartContextService`: assemble minimal RLS-safe chart summary (problems,
      meds, recent notes, last vitals) for prompt injection; audit the access.
- [ ] Provider "Summarize chart" + "Draft note" actions over live data.
- [ ] Wire `AIAssistantWidget` to persist conversation history.
- [ ] [cred] `GEMINI_API_KEY` for live output; provider BAA before real PHI.
- [ ] Tests for services (fake client); prompt snapshots.

## Employer Portal — completion  [offline]
- [ ] Add/edit member UI (create `employer_members`, RLS write already org-scoped).
- [ ] Plan/benefits management screen (edit `employer_groups`).
- [ ] Wellness/participation reporting (aggregate reads).
- [ ] [cred/future] EDI 834 census import.
- [ ] Tests; verify RLS; docs.

## Billing  [cred: Stripe]
- [ ] Migration `payments` (patient_id, org, amount, status, provider_ref, created_at).
- [ ] `paymentsService` **abstraction** (provider-agnostic interface).
- [ ] Wire `BillPayment.tsx` to record intents/history offline (no charge).
- [ ] [cred] Stripe integration behind the service (keys + webhook secret);
      real charge + reconciliation to `claims`/`payments`.
- [ ] Tests; audit log on payment; docs.

## Insurance / Payer  [offline]
- [ ] ERA/835 remittance model + import (new `remittances` table).
- [ ] Appeals workflow on denied claims (status + reason history).
- [ ] Payer-side provider directory / network management.
- [ ] Batch adjudication actions; FWA queue from `ai_risk_score`.
- [ ] Tests; RLS; docs. (Eligibility 270/271 already done via RPC.)

## Patient Portal — completion  [offline] (uploads: [cred])
- [ ] Wire `InsuranceCardModal` to `patients` + `benefits_plans` (remove mock).
- [ ] Patient profile editing: patient-own UPDATE RLS on `patients` + edit form.
- [ ] Emergency contacts: extend `patients` (jsonb) + UI.
- [ ] Medication history view from `prescriptions` (status timeline).
- [ ] [cred] Document uploads to Supabase **Storage** (`patient_documents` table).
- [ ] Tests; RLS; docs.

## Provider Workspace  [offline]
- [ ] Schedule management: provider availability + persisted booking (extend
      `appointments`; new `provider_availability` table).
- [ ] "Today's appointments" dashboard widget (live query).
- [ ] Caseload view (patients by provider).
- [ ] `tasks` table (assignee, due, status) + task list UI + notifications.
- [ ] Patient timeline (merge appointments + notes + claims + messages by date).
- [ ] Clinical dashboard (counts: open notes, tasks, unread messages).
- [ ] Wire `ElectronicPrescribing` → `prescriptions` (remove mock).
- [ ] Wire `LabIntegrationHub` → `lab_results` (remove mock).
- [ ] Tests; RLS; docs.

## Admin Platform  [offline] (invitations/user-creation: [cred])
- [ ] User management UI: list org users, change role (add admin UPDATE RLS on
      `users.role` within org).
- [ ] Permission management (feature flags already on `organizations.permissions`).
- [ ] Reporting: operational + financial dashboards over live aggregates.
- [ ] Retire `Header` `mockTenants`/`mockUsers` → real org context.
- [ ] [cred] Provision new tenants + invite users via **service-role** edge
      function (admin auth API + email/SMTP).
- [ ] Tests; RLS; docs.

## Cross-cutting  [offline]
- [ ] Per-role write RLS across PHI tables.
- [ ] Audit-on-read + DB triggers for comprehensive `audit_logs` coverage.
- [ ] Component tests (RTL) + signed-in RLS integration harness.
- [ ] Rename `package.json`; consolidate remaining mock data sources.
