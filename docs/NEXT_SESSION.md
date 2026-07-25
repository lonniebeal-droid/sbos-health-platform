# SBOS HealthOS — Next Session Brief (frontend + Supabase lane)

_Resume-here doc for the **frontend + Supabase** lane. The backend/infra lane is
maintained separately by the other agent on `phase-0-foundations`; these two
projects/branches are never merged together._

## Snapshot
- **Repo:** `sbos-health-platform` (only). Never touch `sbos-monorepo`.
- **Branch:** `frontend-ehr-2` (pushed; **not merged**). Worktree: `.claude/worktrees/claims`.
- **Tests:** 55 passing. **Build:** green. **Typecheck:** clean.
- **Local backend:** Colima + Supabase (`supabase start`; `supabase db reset`).
- **Full manual:** see `docs/operations/*` (PROJECT_STATUS is the dashboard).
- **⚠️ Blocker:** host disk filled up and killed the local Supabase containers —
  free disk, then `colima start` / `supabase start` / `supabase db reset` before
  live DB work. Also re-verify messaging RLS per role (code committed, DB was down).
- **Latest additions:** Secure Messaging (P1), Clinical (P4 core), RCM incl.
  eligibility RPC (P3), audit logging on note-sign/message-send (P9 partial).
- **Next task:** P2 Telehealth — `telehealth_sessions` table (status/started/ended,
  appointment link), session history + notes linked to `clinical_notes`,
  waiting-room state. Then provider workspace (schedule/tasks/timeline).

## Delivered (priorities 1–4 + partial 9)
- **Core EHR on live data:** organizations, auth/login, patient directory,
  patient self-profile + vitals, prescriptions, appointments, medical records,
  benefits, provider directory, admin audit trail.
- **P1 Employer:** employer_groups + employer_members, portal on live data.
- **P2 Tenant mgmt:** org white-label settings + tenant-admin self-service edit
  (RLS: admin edits only own org). *(Blocked: provisioning new tenants + user
  invitations — need service-role key / email.)*
- **P3 RCM:** claims lifecycle (payment posting + denials), billing dashboard,
  prior authorizations, and **eligibility (270/271)** via a SECURITY DEFINER
  `check_eligibility` RPC (controlled cross-org lookup).
- **P4 Clinical:** clinical_notes (BIRP/SOAP/progress) persistence, treatment_plans,
  assessments; ClinicalDocumentation signs + persists notes.
- **P9 (partial):** real audit logging — signing a note writes an `audit_logs` row.

## Data-layer pattern
`db/database.types.ts` (rows) -> `db/mappers.ts` (row->domain, all unit-tested) ->
`repositories.ts` (factory repos) + `services/*` -> components via `useAsync`,
always with a demo-data fallback. RLS: per-org isolation; patient-self read on PHI;
cross-org access only through audited SECURITY DEFINER RPCs.

## Migrations added on this branch (apply via `supabase db reset`)
`20260725020000_claims_visibility`, `..030000_medical_records`,
`..040000_benefits_plans`, `..050000_provider_profile`, `..060000_employer`,
`..070000_org_settings`, `..080000_claims_lifecycle`, `..090000_eligibility_rpc`,
`..100000_clinical`.

## Local test accounts (password `Password123!`)
`provider@bayarea.test` · `patient@bayarea.test` · `payer@sbospremier.test` ·
`admin@bayarea.test` · `employer@acme.test`

## Remaining priorities & their nature
- **P5 Telehealth:** appointments already carry a room URL. Session history/waiting
  room = a `telehealth_sessions` table + **net-new UI** (TelehealthRoom exists but
  is a call shell). Achievable.
- **P6 Patient:** messaging (`patient_messages` table + net-new thread UI),
  self-profile editing (add a patient-own UPDATE RLS policy + edit UI), insurance
  card (data exists), **document uploads (needs Supabase Storage bucket config)**,
  **bill pay (real payments need Stripe — BLOCKED, credentials)**.
- **P7 Provider:** schedule/caseload/dashboard/tasks/notifications — mostly
  **net-new UI** over existing repos (appointments, patients, clinical_notes).
- **P8 Jessie AI:** wire `/api/ai/*` prompts to real chart data (chart summaries,
  treatment recommendations) — achievable; voice = future.
- **P9 Security:** extend audit logging to more PHI reads/writes; full RLS review;
  input validation. Mostly achievable.

## Blockers (owner infra/credentials only)
Tenant provisioning + user invitations (service-role/email); document uploads
(Storage bucket) ; bill pay (Stripe); hosted Supabase + BAA before real PHI;
domain/DNS/production secrets.

## Immediate next task
**P6 secure messaging** (`patient_messages` table + participant RLS + a thread UI)
or **P5 telehealth session history** — both achievable without credentials.

## Commands to resume
```bash
cd /Users/lonniebgroupllc/sbos-health-platform/.claude/worktrees/claims
colima start && supabase start && supabase db reset
npm run lint && npm test && npm run build
```
