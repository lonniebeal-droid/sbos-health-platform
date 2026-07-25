# SBOS Backend / API Server

The backend is a single Express app in [`server.ts`](../server.ts). In
production it is bundled by esbuild to `dist/server.cjs` and also serves the
built Vite SPA. In development it runs under `tsx` and proxies the frontend
through Vite middleware.

This document describes what the server **actually** does today — no
aspirational endpoints.

## API surface

Base path: `/api` (the server also serves the SPA for all non-API routes).

| Method | Path | Body | Success response |
| ------ | ---- | ---- | ---------------- |
| GET  | `/api/health` | — | `{ status, system, version, timestamp, aiEngineActive }` |
| POST | `/api/ai/chat` | `{ prompt: string (1–8000), context?: "general_patient" \| "clinical_provider" \| "insurance_admin" \| "employer_hr" }` | `{ reply, suggestedActions }` |
| POST | `/api/ai/clinical-notes` | `{ rawNotes: string (1–20000), patientName?, visitType? }` | `{ birpNote: { behavior, intervention, response, plan, suggestedICD[], suggestedCPT[] } }` |
| POST | `/api/ai/fraud-analysis` | `{ claimData: object }` | `{ riskScore, recommendation, riskFlags[] }` |
| GET  | `/api/docs/openapi.json` | — | OpenAPI 3 spec (served from `docs/openapi.json`) |

Behavior notes:

- **AI fallback:** if `GEMINI_API_KEY` is unset, the `/api/ai/*` endpoints
  return canned demo payloads with HTTP 200 (so the UI works offline). With a
  key, they call Gemini (`GEMINI_MODEL`, default `gemini-2.0-flash`).
- **Validation:** invalid/oversized bodies return `400` with `{ error }`.
- **Unknown API routes:** `/api/*` that matches nothing returns `404`
  `{ "error": "Not found" }` (JSON, never the SPA HTML).
- **Errors:** handlers return a generic `500 { error }`; full detail is logged
  server-side only (no internal error text is sent to clients).

## Security posture

Configured in the "SECURITY & HARDENING MIDDLEWARE" block of `server.ts`:

- `x-powered-by` disabled; `trust proxy` = 1 (correct `req.ip` behind one LB).
- JSON body limit **256 kb**.
- Response headers: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer`,
  `X-DNS-Prefetch-Control: off`, `Cross-Origin-Opener-Policy: same-origin`, and
  `Strict-Transport-Security` (production only).
- **Rate limiting** (in-memory, fixed window, per IP): `/api` → 120 req/min;
  `/api/ai` → 15 req/min. Over-limit responses are `429` with `Retry-After`.
- Structured request logging on `/api` (`method url status ms`).
- Graceful shutdown on `SIGTERM`/`SIGINT` (drains, 10 s hard-exit backstop).

## Environment variables

| Var | Used by | Notes |
| --- | ------- | ----- |
| `GEMINI_API_KEY` | server | Enables real AI; unset → demo fallback. |
| `GEMINI_MODEL` | server | Default `gemini-2.0-flash`. |
| `GEMINI_TIMEOUT_MS` | server | Upstream timeout for Gemini calls (ms). Default `30000`. |
| `PORT` | server | Default `3000`. |
| `NODE_ENV` | server | `production` enables static SPA serving + HSTS. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | frontend / data layer | See `.env.example`; not consumed by `server.ts`. |

## Running

```bash
npm run dev     # tsx server.ts + Vite middleware (frontend HMR)
npm run build   # vite build (dist/) + esbuild server (dist/server.cjs)
npm start       # node dist/server.cjs (production)
```

Docker:

```bash
docker build -t sbos-health .
docker run -p 3000:3000 -e GEMINI_API_KEY=... sbos-health
# or: docker compose up --build
```

## Verification

- **Local preflight:** [`scripts/deploy.sh`](../scripts/deploy.sh) runs
  typecheck + build + a real container smoke test (auto-selects a free host
  port).
- **CI:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs
  typecheck, tests, build, and a `docker` job that boots the image and asserts
  the runtime contract (`/api/health` 200, `/api/docs/openapi.json` 200, `/`
  200, removed route 404) on every push/PR.
- **Unit tests:** [`tests/server.test.ts`](../tests/server.test.ts) covers the
  rate limiter.

## Known gaps / recommendations (not yet done)

These are intentional follow-ups, several blocked on credentials or a decision:

- **AI endpoints are unauthenticated.** They are rate-limited but open to any
  caller who can reach the server (cost/abuse exposure). Adding Supabase-JWT
  verification on `/api/ai/*` needs the server to hold the Supabase JWT secret
  (owner-provisioned) and is a cross-cutting change.
- **Rate limiter is per-instance (in-memory).** Multiple instances behind a load
  balancer would each keep their own counters; a shared store (e.g. Redis) is
  needed for a true global limit.
- **No Content-Security-Policy header.** A CSP would harden the SPA but must be
  authored against the frontend's real script/style/connect needs to avoid
  breaking it.
- **DATABASE_URL secret** in `terraform/main.tf` should move to Secret Manager
  at deploy time (see the NOTE there).
