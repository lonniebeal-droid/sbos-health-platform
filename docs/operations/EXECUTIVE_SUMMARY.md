# SBOS HealthOS — Executive Summary

## What SBOS HealthOS is
SBOS HealthOS is a **white-label, multi-tenant behavioral-health EHR + practice
platform** — one system serving patients, providers, payers (insurers),
employers, and administrators, each with a role-specific portal over shared,
tenant-isolated data. It combines clinical documentation, scheduling,
prescriptions, revenue-cycle/claims, benefits, secure messaging, and an AI
assistant ("Jessie").

## Business goals
- Give behavioral-health clinics a single operating system (clinical + billing +
  engagement) instead of stitching together SimplePractice, a clearinghouse, and
  a messaging tool.
- Sell as white-label SaaS to health systems, payers, and employer groups
  (multi-tenant with per-tenant branding and feature flags).
- Differentiate with AI-assisted documentation and revenue-cycle intelligence.

## Target customers
Behavioral-health clinics and networks; health systems; commercial payers;
self-insured employer groups. Each becomes a **tenant** (an `organizations` row
with white-label settings).

## Competitive advantages
- **Multi-tenant white-label** from the ground up (RLS-enforced isolation).
- **AI-native** clinical documentation (BIRP/SOAP), claims FWA scoring, benefits
  explainer, eligibility reasoning (Google Gemini via a server proxy).
- **Unified revenue cycle** (eligibility → prior auth → claims → payment/denial →
  billing dashboard) in the same product as the clinical record.
- Modern, fast SPA (React 19 + Vite + Tailwind) with a typed, testable data layer.

## Major modules
Patient portal · Provider workspace · Payer/Insurance hub · Employer portal ·
Admin platform · Claims & revenue cycle · Clinical documentation · Secure
messaging · Jessie AI · (Telehealth — in progress).

## Current maturity
Working **local** application: authentication and ~20 workflows run on real
Supabase data with per-tenant Row-Level Security. The data layer (typed models →
mappers → repositories → services) is consistent and unit-tested (55 tests).
Estimated ~50% of the full product vision; core role workflows are functional.

## Deployment readiness
**Not production-ready.** The platform runs against a local Supabase stack only.
Before production it requires: hosted, HIPAA-eligible Supabase with a signed BAA;
real Stripe (billing) and Storage (documents) integration; service-role-backed
admin provisioning/invitations; a security review; and hosting/DNS/secrets. See
SECURITY.md and ROADMAP.md. No real PHI should be entered until those are done.
