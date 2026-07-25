# SBOS HealthOS

White-label, multi-tenant healthcare operating system. A single-page React app
(role-based portals for patient / provider / insurance / employer / admin)
served by an Express backend that exposes health, AI, and OpenAPI endpoints and
reads its data from Supabase.

> Status is tracked in [`PROGRESS.md`](PROGRESS.md). This README describes what
> is actually in the repository today — it is not a roadmap.

## Architecture

| Layer | Tech | Notes |
| ----- | ---- | ----- |
| Frontend | Vite 6 + React 19 + TypeScript | SPA; role-based portals. Reads Supabase directly via a typed data layer (`src/lib/…`). |
| Backend | Express (`server.ts`) | Serves the built SPA + `/api/health`, `/api/ai/*` (Gemini), `/api/docs/openapi.json`. See [`docs/BACKEND.md`](docs/BACKEND.md). |
| Data / Auth | Supabase (Postgres + Auth + RLS) | Local stack via the Supabase CLI; migrations in `supabase/migrations/`. |
| AI | Google Gemini (`@google/genai`) | Server-side only; falls back to demo responses when no key is set. |

## Prerequisites

- Node.js 22 (LTS) and npm
- Docker (for the container image / compose)
- Supabase CLI + a container runtime (e.g. Colima) for the local database

## Quick start

```bash
npm install
cp .env.example .env      # fill in values as needed (see below)
npm run dev               # http://localhost:3000 (Express + Vite middleware)
```

Without a `GEMINI_API_KEY`, the `/api/ai/*` endpoints return canned demo
payloads so the UI works offline.

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Run the server with Vite middleware (frontend HMR). |
| `npm run build` | Build the SPA (`dist/`) and bundle the server (`dist/server.cjs`). |
| `npm start` | Run the production bundle (`node dist/server.cjs`). |
| `npm run lint` | Typecheck (`tsc --noEmit`). |
| `npm test` | Run the Vitest suite. |
| `npm run clean` | Remove build output. |

## Environment

See [`.env.example`](.env.example) for the full list. Key variables:

- `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_MS` — server-side AI.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — browser Supabase client.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never expose to the client.
- `PORT`, `NODE_ENV` — server runtime.

## Docker

```bash
docker build -t sbos-health .
docker run -p 3000:3000 -e GEMINI_API_KEY=... sbos-health
# or:
docker compose up --build
```

The image is multi-stage (dev tooling excluded from the runtime), runs as a
non-root user, and defines a `HEALTHCHECK` against `/api/health`.

## Testing & verification

- `npm test` — unit tests (data-layer mappers, RBAC/permissions, rate limiter,
  Gemini client memoization).
- [`scripts/deploy.sh`](scripts/deploy.sh) — local release preflight: typecheck
  + build + a real container smoke test on a free port.
- CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs typecheck,
  tests, build, and a Docker job asserting the runtime contract on every push.

## Documentation

- [`docs/BACKEND.md`](docs/BACKEND.md) — API surface, security posture, env, run/verify, known gaps
- [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — deployment notes
- [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) · [`TECH_DEBT.md`](TECH_DEBT.md) · [`PROGRESS.md`](PROGRESS.md)
- [`docs/TODO.md`](docs/TODO.md) · [`docs/NEXT_SESSION.md`](docs/NEXT_SESSION.md)
