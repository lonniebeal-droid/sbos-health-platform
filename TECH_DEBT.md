# SBOS HealthOS Technical Debt & Refactoring Roadmap
**Version:** 3.4.0-enterprise  

---

## Technical Debt Inventory & Remediation Strategy

### 1. Hardcoded Mock Fallbacks in Development Mode
- **Current State:** Development environment uses `mockTenants.ts` and `mockData.ts` as fallback data stores when direct PostgreSQL/Supabase connections are unconfigured in local sandbox mode.
- **Remediation Plan:** In multi-region production, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Cloud Run environment variables to direct all state operations to Cloud SQL PostgreSQL.

### 2. WebRTC STUN/TURN Server Resilience
- **Current State:** WebRTC signaling endpoints currently negotiate with Google's public STUN servers (`stun:stun.l.google.com:19302`).
- **Remediation Plan:** For production deployments behind strict enterprise hospital firewalls, provision dedicated Coturn TURN relay servers with TLS (`turns://`).

### 3. Redis Cache Layer for GraphQL & Tenant Feature Flags
- **Current State:** GraphQL query responses and white-label tenant permission checks query database/in-memory states on each request.
- **Remediation Plan:** Deploy Redis (Cloud Memorystore) to cache tenant branding configuration and active user permissions with a 300-second TTL.
