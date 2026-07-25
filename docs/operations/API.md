# API — SBOS HealthOS

Two surfaces: (1) the **Express HTTP API** in `server.ts`, and (2) the
**client-side data layer** (`src/lib`) that talks to Supabase directly. The SPA
uses Supabase for data and the Express API only for `/api/ai/*` + health/docs.

Canonical machine-readable spec: `docs/openapi.json`, served at
`/api/docs/openapi.json`. Backend deep-dive: `docs/BACKEND.md`.

## HTTP API (Express)

Base: `/api`. JSON. Bodies capped at 256 kb. Rate limits: `/api` 120/min/IP,
`/api/ai` 15/min/IP (429 + `Retry-After` when exceeded).

### `GET /api/health`
Liveness. → `200`
```json
{ "status": "ok", "system": "SBOS Healthcare Operating System Engine",
  "version": "3.4.0-enterprise", "timestamp": "…", "aiEngineActive": false }
```

### `POST /api/ai/chat`
Conversational assistant (Jessie).
- Request: `{ "prompt": "string (1–8000)", "context": "general_patient | clinical_provider | insurance_admin | employer_hr" }`
- `200`: `{ "reply": "…", "suggestedActions": ["…"] }`
- `400`: missing/oversized `prompt`. `413`: body > 256 kb. `429`: rate limited.
- Without `GEMINI_API_KEY`: deterministic demo reply (still `200`).

### `POST /api/ai/clinical-notes`
BIRP clinical note drafting + ICD/CPT suggestions.
- Request: `{ "rawNotes": "string (1–20000)", "patientName?": "…", "visitType?": "…" }`
- `200`: `{ "birpNote": { "behavior", "intervention", "response", "plan", "suggestedICD": [], "suggestedCPT": [] } }`
- `400` / `413` / `429` as above.

### `POST /api/ai/fraud-analysis`
Claims Fraud/Waste/Abuse triage.
- Request: `{ "claimData": { … } }` (non-null object)
- `200`: `{ "riskScore": 0-100, "recommendation": "…", "riskFlags": ["…"] }`
- `400` if `claimData` missing/not an object.

### `GET /api/docs/openapi.json`
Serves the OpenAPI spec. → `200`.

### Errors
- Unknown `/api/*` → `404 { "error": "Not found" }`.
- Malformed JSON → `400 { "error": "Malformed request body" }`.
- Oversized body → `413 { "error": "Payload too large" }`.
- Server fault → `500 { "error": "Internal server error" }` (detail logged only).

### Example
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"What is my copay for telehealth?","context":"general_patient"}'
```

## Data layer (client → Supabase)

`src/lib/repositories.ts` exposes typed accessors; each returns
`{ data, error }`. Rows (`database.types.ts`) → domain types via `mappers.ts`.
Consumed through the `useAsync` hook.

| Repository | Backing table | Typical operations |
| ---------- | ------------- | ------------------ |
| `organizations` | organizations | read tenant |
| `users` | users | read profile |
| `patients` | patients | list/read (with joined user) |
| `appointments` | appointments | list/read (with names) |
| `claims` | claims | list detailed (payer/patient views) |
| `prescriptions` | prescriptions | list (with provider) |
| `priorAuths` | prior_authorizations | list/read |
| `auditLogs` | audit_logs | read/append |

All queries are subject to Postgres RLS (tenant/role scoped). Exact method
signatures live in `src/lib/repositories.ts` (frontend lane).

## Services

- `authService` — Supabase Auth (sign in/out, session).
- `organizationService` — organization/tenant lookups.

> Note: the previous fake REST endpoints (`/api/auth`, `/api/appointments`,
> `/api/billing`, `/api/graphql`, …) were **removed**; they returned fabricated
> data and were never used by the client. Do not re-introduce them — the client
> uses Supabase directly.
