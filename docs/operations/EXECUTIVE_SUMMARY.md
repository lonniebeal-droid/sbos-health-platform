# EXECUTIVE SUMMARY — SBOS HealthOS

## What SBOS HealthOS is

SBOS HealthOS is a **white-label, multi-tenant healthcare operating system**: a
single web application that presents role-specific portals (patient, provider,
insurance/payer, employer, admin) over a shared, tenant-isolated data model. A
lightweight Express backend serves the app and provides AI assistance ("Jessie")
plus health/OpenAPI endpoints; application data lives in Supabase (Postgres with
row-level security).

Source of truth for scope: [`metadata.json`](../../metadata.json) and the code
itself. This document describes the current repository, not a sales roadmap.

## Business goals

- Provide a single platform multiple healthcare organizations can operate under
  their own brand (multi-tenant, white-label).
- Reduce administrative friction across scheduling, claims, benefits, and
  clinical documentation.
- Layer AI assistance (care navigation, clinical note drafting, claims fraud
  triage) on top of the operational data.

## Target customers

Per `metadata.json`: healthcare systems, insurance plans / payers, behavioral
health networks, employers, and hospital systems. Each is modeled as an
`organizations.type` (`health_system`, `payer`, `employer_group`, `clinic`).

## Competitive advantages (as designed)

- **Multi-tenant + RLS from the ground up** — tenant isolation enforced in the
  database via `current_user_org_id()` policies, not just app code.
- **AI as a first-class, provider-swappable layer** — Gemini today, with a clean
  server seam and an offline demo fallback so the UI works without a key.
- **Single deployable** — one container serves both the SPA and the API.

## Major modules

| Domain | Where | Notes |
| ------ | ----- | ----- |
| Patient portal | `src/components/patient` (9) | Largest UI surface. |
| Provider portal | `src/components/provider` (4) | |
| Revenue cycle (RCM) | `src/components/rcm` (4) | Prior-auth, claims-adjacent. |
| Insurance/payer | `src/components/insurance` (2) | Claims center. |
| Admin | `src/components/admin` (2) | |
| Employer | `src/components/employer` (1) | Benefits. |
| AI (Jessie) | `server.ts` `/api/ai/*` | Chat, clinical notes, fraud analysis. |
| Data/Auth | `src/lib`, `supabase/` | Supabase Auth + typed repositories + RLS. |

See [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md) for per-module detail.

## Current maturity

**Early / pre-production.** The application compiles cleanly, has 52 passing
unit tests, builds a production bundle, ships a working Docker image, and has
green CI. Several domains are wired to live Supabase data. However, it runs only
against a **local** Supabase stack; it has **not** been deployed to hosted
infrastructure, the AI endpoints are unauthenticated, and no HIPAA BAA is in
place.

## Deployment readiness

**Not ready for production with real PHI.** Blockers are credential/infra/
business items, not primarily code: hosted Supabase + signed BAA, authentication
on AI endpoints, secrets management, DNS/domain, and a shared-store rate limiter
for multi-instance. See [SECURITY](SECURITY.md), [OPERATIONS](OPERATIONS.md),
and [KNOWN_ISSUES](KNOWN_ISSUES.md).
