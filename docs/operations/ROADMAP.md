# ROADMAP — SBOS HealthOS

Remaining work grouped into phases. Completion % reflects the current repository.
Phases are ordered by dependency, not calendar. Many later items are **blocked**
on credentials/infra/business decisions (marked ⛔).

## Phase 0 — Foundations & production-readiness hardening — ~80%
**Objective:** a clean, tested, containerized, CI-verified codebase with honest
docs.
- [x] Remove dead/fake backend endpoints; real API surface only.
- [x] Security headers, per-IP rate limiting, 256kb body cap.
- [x] Correct 4xx/5xx error handling; process fault handlers; graceful shutdown.
- [x] Gemini client memoization + upstream timeout.
- [x] Docker slimming + HEALTHCHECK + Node 22 LTS; CI docker smoke test.
- [x] Terraform secret removal; least-privilege CI token.
- [x] Backend unit tests (rate limiter, AI client, JSON parser).
- [x] Operations Manual (`docs/operations/`).
- [ ] Frontend lane: finish live-data migration of remaining domains.
- **Dependencies:** none for the backend items; frontend items are in the other lane.

## Phase 1 — Data completeness & verification — ~40%
**Objective:** every portal reads/writes real Supabase data under RLS.
- [ ] Verify each portal view against a running Supabase instance.
- [ ] Systematic audit-log writes on mutations.
- [ ] Client-gate ↔ RLS parity check for every table.
- **Dependencies:** local (or hosted) Supabase.

## Phase 2 — Security & compliance — ~20% ⛔ (partly blocked)
**Objective:** safe to handle PHI.
- [ ] ⛔ Authenticate `/api/ai/*` (Supabase JWT secret).
- [ ] ⛔ Hosted Supabase project + signed BAA.
- [ ] ⛔ Secrets in Secret Manager; rotate historical terraform password.
- [ ] Content-Security-Policy authored against the SPA's needs.
- [ ] MFA.
- **Dependencies:** Supabase JWT secret, BAA, Secret Manager.

## Phase 3 — Reliability & scale — ~15% ⛔
**Objective:** run more than one instance safely.
- [ ] ⛔ Shared-store (Redis) rate limiter.
- [ ] Load/perf testing of AI endpoints.
- [ ] Structured/JSON logs shipped to a log sink.
- **Dependencies:** Redis, log/observability platform.

## Phase 4 — Feature depth — ~10% ⛔
**Objective:** complete the operational modules.
- [ ] Scheduling (availability, recurrence, conflicts).
- [ ] ⛔ Billing/payments (processor).
- [ ] ⛔ Notifications (SMS/email provider).
- [ ] Messaging.
- [ ] ⛔ RCM external integrations (eligibility, e-prescribe, lab).
- [ ] Telehealth signaling/WebRTC.
- **Dependencies:** Stripe, Twilio/Resend, clearinghouse, real-time infra.

## Phase 5 — Deployment & operations — ~15% ⛔
**Objective:** production deployment.
- [ ] ⛔ Decide GCP-Cloud-SQL-vs-Supabase (see [DECISIONS](DECISIONS.md#d5)).
- [ ] ⛔ Provision infra; DNS/domain; TLS.
- [ ] CD pipeline (image publish + deploy).
- [ ] Runbooks, backups, monitoring/alerting.
- **Dependencies:** cloud account, DNS, business decision on data plane.
