# DEV SETUP — SBOS HealthOS

Get a new engineer productive quickly. See also the root
[`README.md`](../../README.md).

## Prerequisites

- **Node.js 22** (LTS) + npm.
- **Docker** (for the image / compose) — a container runtime such as **Colima**
  on macOS.
- **Supabase CLI** (for the local database stack).

## First run (frontend + backend, no DB)

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:3000  (Express + Vite middleware)
```

Without `GEMINI_API_KEY`, `/api/ai/*` returns demo payloads — the UI works
offline. Without Supabase running, data views degrade gracefully / use demo
fallbacks.

## Local Supabase (for real data)

```bash
# start the container runtime (example: Colima)
colima start
# start the local Supabase stack
supabase start            # API :54321, DB :54322, Studio :54323
supabase db reset         # apply supabase/migrations/* and seed.sql
```

Copy the printed `anon` key + URL into `.env`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Keep the service-role key
server-side only.

## Environment variables

See [`.env.example`](../../.env.example). Highlights:

| Var | Purpose |
| --- | ------- |
| `GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_TIMEOUT_MS` | Server-side AI (optional). |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Browser Supabase client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only — never expose to the client. |
| `PORT` / `NODE_ENV` | Server runtime. |

## Scripts

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Dev server (HMR). |
| `npm run build` | SPA (`dist/`) + server bundle (`dist/server.cjs`). |
| `npm start` | Run production bundle. |
| `npm run lint` | `tsc --noEmit`. |
| `npm test` | Vitest. |
| `npm run clean` | Remove build output. |
| `./scripts/deploy.sh` | Release preflight (build + container smoke test). |

## Docker

```bash
docker build -t sbos-health .
docker run -p 3000:3000 -e GEMINI_API_KEY=... sbos-health
docker compose up --build      # if the compose plugin is installed
```

> Tip: repeated local image builds can fill the container VM disk. Prune with
> `docker builder prune -af` periodically (do **not** restart a shared Colima VM
> that another workstream depends on).

## Verifying your change (before pushing)

1. `npm run lint` — typecheck clean.
2. `npm test` — all tests pass.
3. If backend/Docker changed: `./scripts/deploy.sh` (or push and let CI's docker
   job verify).
4. Update the relevant `docs/operations/*` doc + `PROGRESS.md`.
