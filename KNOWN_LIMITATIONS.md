# KNOWN LIMITATIONS — SBOS HealthOS

Release-lens limitations. Full issue tracker with owners:
[`docs/operations/KNOWN_ISSUES.md`](docs/operations/KNOWN_ISSUES.md). Tech-debt
ledger: [`TECH_DEBT.md`](TECH_DEBT.md) (frontend-lane living doc).
Date: 2026-07-25 · Commit: `453bd8d`.

## Findings (limitations) & evidence

| # | Limitation | Evidence | Risk |
| - | ---------- | -------- | ---- |
| L1 | Runs against local Supabase only; not deployed | no hosted infra provisioned | — (expected pre-launch) |
| L2 | AI endpoints unauthenticated | `server.ts` | High (see SECURITY_REVIEW) |
| L3 | Rate limiter is single-instance | in-memory `Map` | Medium |
| L4 | Billing/Payments UI-only | `BillPayment.tsx`; no processor | Medium |
| L5 | Notifications & Messaging not implemented | no code/tables | Medium |
| L6 | Telehealth is a UI shell | `TelehealthRoom.tsx`; no signaling | Medium |
| L7 | RCM external integrations absent | `rcm/*` UIs only | Medium |
| L8 | No test coverage instrumentation; components untested | Vitest, 52 tests, no coverage tool | Medium |
| L9 | Few DB indexes | migrations | Medium at scale |
| L10 | `graphql` dependency unused (dead) | no imports | Low |
| L11 | `tsconfig` strict off | `tsconfig.json` | Low–Medium |
| L12 | Health version string fabricated/inconsistent | `server.ts` `3.4.0-enterprise` vs `package.json` `0.0.0` | Low |
| L13 | Logs to stdout only; no metrics/traces/alerts | `server.ts` | Medium (observability) |

## Completed fixes (limitations removed this engagement)

- Fabricated backend endpoints removed (`9c0c5dc`).
- Error-detail leak (`a7d3eaf`) and wrong-status error handling (`6df0205`) fixed.
- Per-request Gemini client construction and unbounded AI calls fixed (`55f26f4`).

## Deferred work

- Everything in L1–L13 not marked fixed — tracked in KNOWN_ISSUES with owners.

## Remaining blockers

- Credentials/infra/business: hosted Supabase + BAA, AI-auth JWT secret, Redis,
  payment/notification/RCM providers, Secret Manager, DNS.
- Cross-lane: `graphql` removal + `tsconfig strict` (owned by `package.json`/
  `tsconfig.json` in the frontend lane).

## Overall risk level

Feature-completeness: **early**. Safety of the *implemented* backend surface:
**good** for non-PHI. PHI readiness: **not yet** (blockers above).
