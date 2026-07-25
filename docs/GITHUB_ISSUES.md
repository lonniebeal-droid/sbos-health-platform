# SBOS HealthOS Backlog & GitHub Issues Tracking

This document outlines active engineering issues and milestone deliverables for SBOS HealthOS.

---

### Issue #101: [Backend] Supabase Row Level Security (RLS) Multi-Tenant Hardening
- **Status**: Completed / Verified
- **Priority**: P0 (Security)
- **Description**: Implemented `tenants`, `profiles`, `appointments`, `patient_messages`, and `claims` tables in PostgreSQL migration schema with RLS constraints for strict tenant isolation.

---

### Issue #102: [Telehealth] WebRTC Signaling Server & Session Token API
- **Status**: Completed / Verified
- **Priority**: P0 (Clinical)
- **Description**: Integrated REST endpoints for generating WebRTC SDP offer/answer tokens, ICE candidates, and session room keys in `/api/telehealth/*`.

---

### Issue #103: [Billing] Stripe Subscription & Payer Billing Webhook Integration
- **Status**: Completed / Verified
- **Priority**: P1 (Revenue)
- **Description**: Created `/api/billing/checkout-session` and `/api/billing/webhook` handlers for enterprise SaaS tier upgrades and claims copay processing.

---

### Issue #104: [Notifications] Twilio SMS & SendGrid Email Dispatcher
- **Status**: Completed / Verified
- **Priority**: P1 (Engagement)
- **Description**: Built `/api/notifications/sms` and `/api/notifications/email` endpoints supporting appointment reminders and 2FA authentication alerts.

---

### Issue #105: [Audit] HIPAA Compliant Immutable Audit Logging Engine
- **Status**: Completed / Verified
- **Priority**: P0 (Compliance)
- **Description**: Developed `/api/audit/record` and `/api/audit/logs` endpoints to log every PHI access, role switch, and EHR query with actor NPI and IP tracking.

---

### Issue #106: [API & GraphQL] OpenAPI v3 Specification & GraphQL Query Engine
- **Status**: Completed / Verified
- **Priority**: P1 (Developer Experience)
- **Description**: Published OpenAPI 3.0 specs at `/api/docs/openapi.json` and implemented GraphQL query handler at `/api/graphql`.
