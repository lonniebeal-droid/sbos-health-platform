# SBOS HealthOS — Next Session Brief (frontend + Supabase lane)

_Resume-here doc for the **frontend + Supabase** lane. The backend/infra lane is
maintained separately by the other agent on `phase-0-foundations`; these two
projects/branches are never merged together._

## Snapshot
- **Repo:** `sbos-health-platform` (only). Never touch `sbos-monorepo`.
- **Branch:** `frontend-ehr-2` (pushed; **not merged** into anything).
- **Worktree:** `.claude/worktrees/claims`.
- **Tests:** 47 passing (`npm test`). **Build:** green. **Typecheck:** clean.
- **Local backend:** Colima + Supabase (`supabase start`; `supabase db reset`).

## Components on real (Supabase) data
organizations, auth/login, patient directory, patient self-profile + vitals,
prescriptions, appointments, claims (+adjudication), prior authorizations,
medical records, benefits, provider directory, admin audit trail,
**employer portal (groups + roster)**, **tenant management (org list + own-org
settings edit)**.

## Data-layer pattern (established)
`src/lib/db/database.types.ts` (row types) -> `src/lib/db/mappers.ts` (row->domain)
-> `src/lib/repositories.ts` (factory repos) -> components via `useAsync`, always
with a demo-data fallback. Every mapper has Vitest coverage.

## Migrations added on this branch
`20260725020000_claims_visibility`, `..030000_medical_records`,
`..040000_benefits_plans`, `..050000_provider_profile`, `..060000_employer`,
`..070000_org_settings`. Seed extended with an employer user + employer/tenant data.

## Local test accounts (password `Password123!`)
`provider@bayarea.test` · `patient@bayarea.test` · `payer@sbospremier.test` ·
`admin@bayarea.test` · `employer@acme.test`

## Blockers (need owner infra/credentials — cannot be done from the browser lane)
- **Tenant provisioning (create new org) + user invitations / user creation**:
  require the Supabase **service-role key** (admin auth API) and/or email/SMTP.
  Must run server-side or via a Supabase edge function holding the secret.
- Beyond local: hosted Supabase + signed **BAA** before real PHI; production
  secrets / domain / DNS / payment + clearinghouse credentials.

## Immediate next task (achievable without credentials)
**Priority 3 — Revenue Cycle Management**: Insurance Hub, eligibility
verification, claims lifecycle transitions, payment posting, denials, and a
billing dashboard — building on the existing `claims` table/repo. Then Priority 4
(clinical: progress/BIRP/SOAP notes, treatment plans, assessments, diagnoses).

## Commands to resume
```bash
cd /Users/lonniebgroupllc/sbos-health-platform/.claude/worktrees/claims
colima start && supabase start && supabase db reset
npm run lint && npm test && npm run build
```
