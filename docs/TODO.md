# SBOS HealthOS — TODO

Status: ✅ Complete · 🔄 In Progress · ⛔ Blocked · ⬜ Not Started
Grouped by priority. Authoritative task list; keep in sync with `TECH_DEBT.md`.

---

## P0 — Required for MVP

### Foundation & backend (done)
- ✅ Local Supabase stack (Colima) running
- ✅ Single canonical DB schema (removed conflicting migration)
- ✅ Supabase Auth integration + real per-tenant RLS (verified)
- ✅ Seed with real auth users + sample clinical data
- ✅ Typed data layer (client, db types, mappers, repositories, services)
- ✅ Real login flow (auth context + login screen) wired into the app
- ✅ Real test runner (Vitest, 33 tests) + working CI

### Replace mock data with real (core EHR)
- ✅ Organizations (org context)
- ✅ Patient directory (`provider/PatientManagement`)
- ✅ Prescriptions (`patient/PrescriptionsView`) + real refill
- ✅ Appointments (`patient/PatientDashboard`)
- 🔄 Claims (`patient/ClaimsTracker`, `insurance/InsuranceClaimsCenter`) — **NEXT**
      (needs a patient/provider-side claims RLS policy)
- ⬜ Patient self-profile in `PatientDashboard` header (still `samplePatient`)
- ⬜ Medical records (`patient/MedicalRecordsView`) — needs `medical_records` table
- ⬜ Benefits (`patient/BenefitsExplainer`) — needs `benefits_plans` table
- ⬜ Provider search (`patient/ProviderSearch`) — needs provider profile fields
- ⬜ Prior auth (`rcm/PriorAuthEngine`)
- ⬜ Admin tenant management + audit log view (`admin/*`)
- ⬜ Employer portal (`employer/EmployerPortal`)
- ✅ Header tenant switcher → real org context (uses `OrgProvider`; demo fallback remains when Supabase is unavailable)

### Backend cleanup
- ⬜ Remove/replace fake `server.ts` endpoints (auth/login, tenants, appointments,
      messages, billing, notifications, storage, audit, analytics, graphql);
      keep real `/api/ai/*` + `/api/health`
- ⬜ Reconcile the 4 inconsistent org/tenant data sources

## P1 — Required before beta
- ⬜ RBAC enforced in RLS (per-role writes) and on any server routes
- ⬜ Real audit logging on every PHI access (write to `audit_logs`)
- ⬜ Schema extensions: `patient_messages`, `benefits_plans`, `medical_records`,
      provider profile fields (rating/bio/avatar/affiliation)
- ⬜ Claims provider-side visibility RLS
- ⬜ Input validation + error handling on all write paths
- ⬜ Integration tests: sign in per role and assert RLS boundaries
- ⬜ MFA (Supabase Auth) enable + enforcement per tenant flag
- ⬜ Telehealth: real WebRTC signaling (replace fake `/api/telehealth/*`)
- ⬜ Real notifications (email/SMS) or remove the fake endpoints

## P2 — Production hardening
- ⛔ Hosted Supabase project + signed **BAA** (owner-provided) before real PHI
- ⬜ Security headers (helmet), CORS policy, rate limiting
- ⬜ Encryption at rest/in transit review; secret management strategy
- ⬜ Logging/observability; error boundaries in React
- ⬜ Terraform vs Supabase target decision; real deploy pipeline
- ⬜ Load/perf testing; bundle code-splitting (build warns on chunk size)
- ⬜ Independent security review / pen test
- ⬜ Complete OpenAPI spec (or remove if going Supabase-direct)

## P3 — Nice-to-have
- ⬜ Pick one package manager (remove `bun.lock` or `package-lock.json`)
- ⬜ Rename `package.json` (`react-example` → real name/version)
- ⬜ Split `server.ts` into routers/services as real logic lands
- ⬜ `supabase gen types` to auto-generate DB types and cross-check hand-written ones
- ⬜ Storybook / component visual tests
- ⬜ Analytics dashboard on real aggregates (replace fake `/api/analytics`)

---

## Blocked (needs owner input)
- ⛔ Hosted Supabase + BAA, production secrets, domain/DNS, payment &
      clearinghouse credentials — required only to move beyond local development.
