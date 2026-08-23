STATUS: FUNCTIONAL MVP / DEMO READY

VERIFIED:
- authentication
- tenant/RLS foundation
- patient/client workflows
- appointments
- intake
- clinical notes
- self-booking
- billing workflow structure
- eRx/labs structure
- tenant provisioning
- frontend build
- backend build
- Docker health

NOT PRODUCTION-PHI READY:
- hosted Supabase + BAA
- JWT authentication for /api/ai/*
- production secret management
- shared multi-instance rate limiter
- external vendor credentials/integrations

NOTES:
- This tag/release marks the repository's checkpoint for a FUNCTIONAL MVP
  suitable for local/demo operation only. Do NOT treat this as production or
  HIPAA-compliant. See docs/ for details on outstanding blockers and
  operational steps required before production.
