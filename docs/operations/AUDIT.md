# SBOS HealthOS — Code Audit & Documentation Verification

**Date:** 2026-07-25 · **Branch:** `frontend-ehr-2` · **Commit at audit:** `cfa5748`
**Method:** static analysis (grep/ls/git) of the actual codebase. No DB (local
Supabase down — disk). Verifies that `docs/operations/*` matches the code.

## Verified facts
- **Migrations:** 13 in `supabase/migrations/` (enterprise_schema → messaging).
- **Tests:** 55 (`mappers.test.ts` 31 · `permissions.test.ts` 14 · `dataLayer.test.ts` 10).
- **Typecheck/build:** `npm run lint` + `npm run build` green at `cfa5748`.
- **Components:** 27 `.tsx` under `src/components/`.

## Data-source classification (verified by import + usage)

### Live data + demo fallback (13) — wired to `repositories`/`services`
PatientDashboard, PatientManagement, PrescriptionsView, ClaimsTracker,
BenefitsExplainer, MedicalRecordsView, ProviderSearch, ClinicalDocumentation,
PriorAuthEngine, EligibilityVerifier, BillingDashboard, InsuranceClaimsCenter,
TenantManagement.

### Real, no mock import (9)
MessagingCenter (real), EmployerPortal (real; local demo const), AdminPortal
(real audit logs; local fallback const), InsuranceHub (container),
ProviderDashboard (container), LoginScreen, AIAssistantWidget (AI proxy),
AIClinicalAssistant (AI proxy), BillPayment (**shell — no real payment; Stripe blocked**).

### Still MOCK-ONLY (5) — not yet on the data layer
| Component | Domain | Backing table? | Blocker to finish |
|---|---|---|---|
| `rcm/ElectronicPrescribing.tsx` | e-Prescribing | `prescriptions` exists | none — offline-buildable |
| `rcm/LabIntegrationHub.tsx` | Lab results | `lab_results` exists | none — offline-buildable |
| `patient/TelehealthRoom.tsx` | Telehealth call | needs `telehealth_sessions` | none for data model; video needs WebRTC infra |
| `common/Header.tsx` | Tenant/user switch | `organizations`/`users` exist | none — offline-buildable (retire `mockTenants`/`mockUsers`) |
| `patient/InsuranceCardModal.tsx` | Insurance card | `benefits_plans`/`patients` exist | none — offline-buildable |

## Corrections applied to the manual after this audit
- IMPLEMENTATION_STATUS: explicitly mark **e-Prescribing** and **Lab Integration**
  as mock-only (previously implied under provider/RCM but not called out).
- PROJECT_STATUS: completion re-derived below from verified live-vs-mock counts.

## Completion recalculation (verified, not aspirational)
Of the ~22 functional surfaces (excluding pure containers), **~15 are on live
data**, **~5 are mock-only but offline-buildable**, **2 are credential-blocked
(BillPayment/Stripe, uploads/Storage)**.

- **Overall completion ≈ 50%** (front-end lane; backend lane separate).
- **MVP completion ≈ 65%** (all five role portals function on live data).
- **Production readiness ≈ 20%** (local only; no hosted infra/BAA/payments/storage;
  audit logging partial; no component/integration/e2e tests).

These match `PROJECT_STATUS.md`; no inflated claims found. No feature is documented
as complete that is not present in code.

## Discrepancies / debt confirmed
1. `Header` still imports `mockTenants`/`mockUsers` (org context has real orgs) — retire.
2. `ElectronicPrescribing` + `LabIntegrationHub` render `mockData` though their
   tables (`prescriptions`, `lab_results`) exist — straightforward to wire offline.
3. `InsuranceCardModal` uses `samplePatient`/`sampleBenefitsPlan` — data exists live.
4. `BillPayment` is a UI shell (correct — real payment blocked on Stripe).
5. Messaging live per-role RLS check still pending DB recovery (code + unit tests done).

_Conclusion: the Operations Manual is accurate. Remaining offline work is
well-scoped (see CHECKLISTS.md); credential-blocked items are isolated
(see DEPENDENCY_GRAPH.md)._
