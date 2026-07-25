# SBOS HealthOS — Testing

## Current state
- **Runner:** Vitest. **Command:** `npm test` (`vitest run`).
- **Count:** **55 tests**, all passing (as of `2c98ba6`).
- **Files:**
  - `src/tests/mappers.test.ts` — every `db/mappers.ts` mapper (organizations,
    patient, appointment, claim, prior-auth, medical record, benefits, provider,
    employer group/member, clinical note, treatment plan, assessment, message
    thread/message) incl. edge/fallback cases.
  - `src/tests/dataLayer.test.ts` — repositories (query construction + error
    propagation via a fake Supabase client) and services (auth, organization,
    eligibility RPC).
  - `src/tests/permissions.test.ts` — RBAC matrix.
- **Typecheck:** `npm run lint` (`tsc --noEmit`) — clean.
- **Build:** `npm run build` (vite + esbuild) — green.

## Coverage character
Strong unit coverage of the **data layer** (mappers, repositories, services) —
the highest-risk, most-reused code. RLS behavior is validated **manually** via
signed-in `@supabase/supabase-js` scripts during development (per-role reads/
writes), not yet automated.

## Gaps / remaining
- **No component tests** (React Testing Library) for the portals/screens.
- **No integration tests** that sign in as each role and assert RLS boundaries
  automatically (currently done by hand; automate in Phase 5).
- **No e2e** (Playwright) — blocked locally by the loopback auth-gateway that
  intercepts localhost, and currently by the disk-full DB outage.
- No coverage reporting configured (`vitest --coverage`).

## Strategy going forward
1. Keep the rule: **every new mapper/repository/service gets a unit test** (held
   so far).
2. Add an integration suite: a test harness that signs in per seeded role against
   local Supabase and asserts each table's RLS (read/write allowed/denied).
3. Add component tests for critical flows (login, claims adjudication, messaging).
4. Add `vitest --coverage` in CI once component/integration tests exist.
5. Playwright e2e once a reachable preview URL is available (resolve the loopback
   gateway / run in CI).

## How to run
```bash
npm run lint     # typecheck
npm test         # unit tests (55)
npm run build    # production build
# live DB checks: supabase db reset, then node scripts using the anon key to
# sign in per role (see git history for _v*.mjs verification patterns).
```
