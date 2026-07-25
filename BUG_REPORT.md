# SBOS HealthOS Defect & Bug Tracking Matrix
**Version:** 3.4.0-enterprise  
**Filter:** All Resolved & Verified Items  

---

## Resolved Issue Log

### Issue #BUG-01: Header Tenant Dropdown Event Typing
- **Severity:** Medium (Type Safety)
- **Component:** `src/components/common/Header.tsx`
- **Root Cause:** Default `onSelectTenant` parameter callback signature lacked unused variable prefix `_tenantId`, leading to linter error.
- **Resolution:** Updated signature to `_tenantId: string => {}`.
- **Status:** RESOLVED & VERIFIED

### Issue #BUG-02: Multi-Tenant Brand Theme Consistency
- **Severity:** Low (UI Branding)
- **Component:** `src/components/admin/TenantManagement.tsx`
- **Root Cause:** Switching active tenants in the admin portal did not reflect immediately in top-level `App.tsx` state.
- **Resolution:** Connected `onSelectTenant` callback to root `App.tsx` `activeTenantId` state.
- **Status:** RESOLVED & VERIFIED

### Issue #BUG-03: Gemini API Key Exposure Prevention
- **Severity:** High (Security)
- **Component:** `server.ts`
- **Root Cause:** Direct client-side calls to LLM APIs bypass HIPAA audit logs.
- **Resolution:** Encapsulated Gemini AI calls inside server-side Express `/api/ai/jessie` route using `@google/genai` SDK and `process.env.GEMINI_API_KEY`.
- **Status:** RESOLVED & VERIFIED

---

## Active Defect Summary
- **Critical (P0):** 0
- **High (P1):** 0
- **Medium (P2):** 0
- **Low (P3):** 0
