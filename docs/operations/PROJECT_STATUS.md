# SBOS HealthOS — Project Status (Primary Dashboard)

> Living document. Update on every milestone. Reflects verified reality only.

| Field | Value |
|---|---|
| **Current date** | 2026-07-25 |
| **Repository** | `sbos-health-platform` (frontend + Supabase lane) — never merged with `sbos-monorepo` |
| **Current branch** | `frontend-ehr-2` (pushed; not merged) |
| **Latest commit** | `2c98ba6` — feat(messaging): secure patient/provider messaging |
| **Version** | `0.x` pre-release (package.json still `0.0.0` / `react-example` — rename pending) |
| **Overall completion** | ~50% (front-end EHR workflows on real data; backend hardening lane separate) |
| **MVP completion** | ~65% (core patient/provider/payer/employer/admin flows work on live data locally) |
| **Production readiness** | ~20% — **local dev only.** No hosted infra, no signed BAA, no real payments/storage. **Not production; do not handle real PHI.** |
| **Current sprint** | Convert remaining UI into complete production workflows |
| **Current phase** | Phase 3 (workflow completion) — see ROADMAP.md |
| **Current milestone** | Secure Messaging ✅ → Telehealth session history (next) |
| **Current priority** | P1 Messaging (done) → P2 Telehealth |

## Working features (verified on live local Supabase, RLS-enforced)
Auth/login; org context; patient directory; patient self-profile + vitals;
prescriptions (+ refill); appointments; claims + lifecycle (payment posting +
denials); billing dashboard; prior authorizations; eligibility 270/271 (RPC);
medical records; benefits; provider directory; admin audit trail; tenant
management (own-org settings edit); employer portal (groups + roster);
clinical notes (BIRP) + treatment plans + assessments; **secure messaging**;
audit logging on note-sign and message-send.

## Features in progress
- Secure messaging: **code complete + committed**; live per-role RLS re-check
  pending local DB recovery (see Blocked / KNOWN_ISSUES).

## Blocked features (need owner credentials/infra)
- Tenant provisioning + user invitations → Supabase **service-role key** / email.
- Document uploads → Supabase **Storage** bucket (currently disabled locally).
- Bill pay (real payments) → **Stripe** credentials.
- Hosted deploy + real PHI → hosted Supabase + **signed BAA**, domain/DNS, secrets.

## Technical debt
package.json name/version; component/integration tests absent (only unit tests);
`server.ts` fake endpoints (other lane); two package managers (other lane);
messaging attachments metadata-only; docs divergence between branches (no-merge).

## Open bugs
None known in application code. See KNOWN_ISSUES.md.

## Critical bugs / environment blockers
- **Host disk full** (`/System/Volumes/Data` 100%) filled the Colima disk image,
  corrupted the containerd blob store, and killed the local Supabase Postgres/
  storage containers. Blocks all local DB verification until the owner frees disk.

## Recent commits (newest first)
```
2c98ba6 feat(messaging): secure patient/provider messaging (threads, read receipts, audit)
f7667b7 feat(security): real HIPAA audit logging on clinical note signing
756850f feat(clinical): notes (BIRP/SOAP/progress) + treatment plans + assessments
47a73aa feat(rcm): real-time eligibility (270/271) via SECURITY DEFINER RPC
0c42469 feat(rcm): claims lifecycle (payment posting + denials) + billing dashboard
d074d5e feat(admin): tenant management on live organizations + self-service settings
05c3ba5 feat(employer): employer portal on live data (groups + roster)
```

## Next planned work
P2 Telehealth (session history + records + visit linkage), then P3 Patient portal
completion (insurance card, profile editing, emergency contacts, medication
history), P4 Provider workspace, P5 Admin platform, P6 Jessie AI. See ROADMAP.md.

## Verification status
`npm run lint` ✅ · `npm test` ✅ 55 · `npm run build` ✅ (as of `2c98ba6`).
Live DB checks blocked by the disk issue above.

## Planning & analysis artifacts (2026-07-25, verified against code)
- `AUDIT.md` — code audit + doc verification + mock inventory.
- `DEPENDENCY_GRAPH.md` — offline-buildable vs credential/infra-blocked modules.
- `CHECKLISTS.md` — per-module implementation checklists.
- `RUNBOOKS.md` — local / staging / production deployment runbooks.
- `RELEASE_PLAN.md` — MVP → Beta → RC → 1.0 with exit criteria.
