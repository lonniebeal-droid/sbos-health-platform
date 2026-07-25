# SBOS HealthOS — API, Services & Repositories

The frontend has **no bespoke REST API for data** — it talks to Supabase directly
(PostgREST + RPC) through the repository/service layer, with RLS as the boundary.
The only HTTP API is the Express AI proxy (backend lane).

## HTTP endpoints (Express `server.ts`, backend lane)
- `POST /api/ai/chat` — Jessie assistant. Body: `{ prompt, context, conversationHistory }`.
  Returns `{ reply, suggestedActions }`. Falls back to canned text without a key.
- `POST /api/ai/clinical-notes` — BIRP generation. Body: `{ rawNotes, patientName,
  visitType }`. Returns `{ birpNote: { behavior, intervention, response, plan,
  suggestedICD[], suggestedCPT[] } }`.
- `POST /api/ai/fraud-analysis` — claims FWA. Body: `{ claimData }`. Returns
  `{ riskScore, recommendation, riskFlags[] }`.
- `GET /api/health` — liveness. `GET /api/docs/openapi.json` — spec.
- Rate limiting + security headers applied (backend lane; see backend docs).

## Supabase RPCs (SECURITY DEFINER)
- `check_eligibility(p_member_id text) -> jsonb` — coverage summary; roles
  insurance/admin/provider only. Example:
  `supabase.rpc('check_eligibility', { p_member_id: 'SBOS-98421092' })` →
  `{ status:'ACTIVE_ELIGIBLE', subscriberName, planName, deductibleRemaining, copays }`.
- `create_message_thread(p_subject text, p_participant_ids uuid[], p_body text) -> uuid`
  — atomic thread creation; returns thread id.
- `is_thread_participant(p_thread uuid) -> boolean` — used by RLS.
- `current_user_org_id()` / `current_user_role()` — used by RLS.

## Repositories (`src/lib/repositories.ts` — `createRepositories(client)`)
Each returns typed rows; generic base gives `list()` + `getById(id)`.
- `organizations`: list, getById, create, update, listAsTenantOrgs, listAsTenants
- `users`: getById, getByEmail
- `patients`: list, getById, **listDetailed** (join user)
- `providers`: list, getById, **listDetailed** (join user)
- `appointments`: list, getById, **listDetailed**, create, updateStatus
- `claims`: list, getById, **listDetailed**, updateStatus, **postPayment**, **deny**
- `prescriptions`: list, getById, requestRefill
- `priorAuths`: list, getById, **listDetailed**, create, updateStatus
- `labResults`, `medicalRecords`, `benefitsPlans`, `employerGroups`,
  `employerMembers`, `treatmentPlans`, `assessments`: list, getById
- `clinicalNotes`: list, create
- `auditLogs`: list, **listDetailed** (join actor), record

`getRepositories()` binds the configured client (throws if unconfigured).

## Services (`src/lib/services/*`)
- **authService** — signIn, signOut, getSession, getAuthUser, getCurrentProfile,
  onAuthStateChange.
- **organizationService** — listOrganizations, createOrganization.
- **eligibilityService** — check(memberId) → check_eligibility RPC.
- **clinicalNotesService** — list, saveBirp (persists signed note + audit log).
- **messagingService** — listThreads, listMessages, sendMessage (+ audit),
  createThread (RPC), markRead, listRecipients.

## Request pattern (browser)
```ts
import { getRepositories } from '@/src/lib/repositories';
const claims = await getRepositories().claims.listDetailed(); // RLS-scoped
```
All reads/writes carry the user's Supabase JWT; the DB enforces access. Components
wrap calls in `useAsync(loader, isSupabaseConfigured, deps)` and fall back to demo
data when unconfigured.
