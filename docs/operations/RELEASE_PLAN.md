# SBOS HealthOS — Release Plan

Path from the current state (≈50% overall, local-only) to **1.0**. Each stage lists
exit criteria. **[offline]** = achievable now; **[cred]** = needs owner infra.
Do not mark a stage done until every box is verified in code + environment.

Current baseline (verified `cfa5748`): 13 migrations, 55 tests, lint/build green;
5 role portals on live local data; messaging shipped; audit logging partial.
Blockers: host disk (local DB down), Stripe, Storage, service-role, hosted/BAA.

---

## MVP  — "core workflows work on real data, per role"  (≈65% → target 100% of MVP scope)
Goal: a clinic could trial the app on **staging with synthetic data**.

- [ ] [infra] Local DB restored (free disk) → re-verify messaging RLS per role.
- [ ] [offline] Finish the 5 mock-only surfaces: e-Prescribing, Lab Integration,
      Insurance Card, Header (real orgs/users), TelehealthRoom (session data).
- [ ] [offline] Telehealth session history + notes linkage.
- [ ] [offline] Patient profile editing + medication history + emergency contacts.
- [ ] [offline] Provider workspace v1: today's appointments, caseload, patient timeline.
- [ ] [offline] Admin user management (role change) + basic reporting.
- [ ] [offline] Per-role write RLS on PHI tables; audit-on-read for key reads.
- [ ] [offline] Component tests for critical flows + signed-in RLS integration suite.
- [ ] [cred] Staging Supabase provisioned; SPA + AI server deployed to staging.
Exit: every role completes its primary journey end-to-end on staging (synthetic).

## Beta  — "real customers, synthetic/limited data; feedback"  (target)
Goal: pilot tenants use it in staging/pre-prod; **no real PHI** yet unless BAA signed.

- [ ] [cred] **BAA signed** (Supabase + AI provider) if any real PHI in beta.
- [ ] [cred] Bill Pay via Stripe (test→live) behind `paymentsService`.
- [ ] [cred] Document uploads + message attachments via Supabase Storage.
- [ ] [cred] Tenant provisioning + user invitations (service-role edge function + email).
- [ ] [offline] Jessie: conversation persistence + live chart-context retrieval.
- [ ] [offline] Insurance: ERA/835 import + appeals workflow.
- [ ] [offline] Notifications model + realtime messaging.
- [ ] MFA enabled; input validation on all write paths; rate limiting.
- [ ] Observability: error monitoring, uptime, log retention.
Exit: pilot tenants operate daily; no P0/P1 open bugs; SECURITY beta items green.

## Release Candidate  — "feature-complete, hardening"  (target)
Goal: production-shaped; only stabilization remains.

- [ ] Independent **security review / pen test** passed; SECURITY.md prod checklist green.
- [ ] Backups + PITR + disaster-recovery drill; incident runbook.
- [ ] Full test coverage: unit + component + integration + e2e (Playwright) in CI.
- [ ] Performance/load testing; bundle code-splitting.
- [ ] Accessibility pass; error boundaries; empty/error states everywhere.
- [ ] All secrets in a manager; none in git history (rotate any exposed).
- [ ] Data migration/versioning strategy for prod (forward-only).
Exit: RC deployed to production infra with synthetic tenant; sign-off from eng + security.

## Version 1.0  — "GA, real PHI, paying tenants"  (target)
- [ ] Production environment live (hosted Supabase HIPAA + BAA, TLS, MFA, backups).
- [ ] First real tenant onboarded with real PHI under BAA.
- [ ] SLAs/monitoring/on-call in place; support runbooks.
- [ ] `package.json` renamed + versioned `1.0.0`; CHANGELOG cut.
- [ ] Legal: BAAs, privacy policy, ToS; HIPAA risk assessment on file.
Exit: GA announced; production stable; rollback tested.

---

## Owner-provided gates (cannot be engineered around)
BAA(s) · hosted HIPAA Supabase · Stripe keys · Storage buckets · service-role +
email/SMTP · domain/DNS · production secrets · MFA/SMS provider · (WebRTC for video).

## Immediate critical path
1. **Free host disk** → local DB back up.
2. Ship the [offline] MVP items (5 wirings + telehealth data + provider/admin v1 + tests).
3. Owner provisions **staging** → deploy → MVP exit.
4. Owner supplies BAA + Stripe + Storage + service-role → Beta.
