# TESTING — SBOS HealthOS

Runner: **Vitest** (node environment, default config — no `vitest.config.ts`;
`test` glob is `**/*.test.ts`). Run with `npm test`.

## Current test inventory

Canonical repo-owned tests in this checkout: **121 tests across 7 files**, plus
the local DB verifier below.

Note: on August 21, 2026, `npm test` in this workspace also traversed mirrored
files under `.claude/worktrees/claims`, so Vitest reported **176 tests across 10
files**. That is runner behavior in this checkout, not the canonical repo-owned
inventory.

| File | Tests | Lane | Covers |
| ---- | ----- | ---- | ------ |
| `src/tests/mappers.test.ts` | 36 | frontend | row → domain type mapping |
| `src/tests/permissions.test.ts` | 14 | frontend | RBAC matrix / access gates |
| `src/tests/dataLayer.test.ts` | 45 | frontend | repository/data-layer behavior |
| `src/tests/appWiring.test.ts` | 1 | frontend | Jessie role wiring |
| `src/tests/claimsAutomation.test.ts` | 10 | frontend | claims automation + denial handling |
| `src/tests/roleMapping.test.ts` | 4 | frontend | live role normalization |
| `tests/server.test.ts` | 11 | backend | rate limiter, Gemini client memoization, JSON parser |
| `scripts/verify-rls.sh` | 18 checks | database | local Supabase RLS/auth mapping, tenant isolation, per-role write RBAC, profile hardening, and audit-log immutability — against the real live schema |
| **Total** | **121** | | |

Verify counts: `for f in src/tests/*.test.ts tests/*.test.ts; do echo "$f"; grep -cE '\b(it|test)\(' "$f"; done`

## Coverage

- No coverage tool is configured (`@vitest/coverage-v8` is not a dependency).
  Coverage % is therefore **unmeasured**; the table above is the honest picture.
- **Backend logic** (`server.ts`): rate limiter, AI client memoization, and JSON
  parsing are unit-tested. The HTTP routes' 4xx/404/200 contract is covered by
  the **CI docker smoke test** (real container), not by in-process unit tests.
- **Frontend**: pure logic (mappers, permissions, data layer) is unit-tested;
  React components are **not** unit-tested.

## Testing strategy

1. **Pure logic → unit tests** (Vitest). Mappers, permissions, rate limiting,
   parsing.
2. **Runtime contract → CI docker smoke test.** Boots the real image and asserts
   `/api/health` 200, `/api/docs/openapi.json` 200, `/` 200, removed route 404,
   malformed→400, missing→400, oversized→413.
3. **Database isolation → local Supabase RLS verifier.** Requires `supabase start`
   plus a local reset against `supabase/migrations/` (which now actually
   reconstructs the live schema, filename-for-filename matching Supabase's
   own applied-migration ledger for the first 18 files — see
   [DATABASE](DATABASE.md)); runs 18
   checks covering auth-to-org mapping, rejected signup/profile escalation,
   cross-tenant patient isolation, per-role write RBAC (e.g. an insurance-role
   account cannot write clinical encounters), and append-only audit-log
   behavior against the seeded DB. Verified locally on 2026-08-21:
   `supabase db reset --local` completed for all 19 files, then
   `npm run verify:rls` passed all 18 checks.
4. **Typecheck as a gate** — `tsc --noEmit` in CI.

## Notable gaps / remaining tests

- Component tests for the portals (needs jsdom + a component testing setup).
- The grants-alignment migration is source-only until it goes through the
  normal hosted deployment review; local verification does not prove the
  hosted privilege matrix has been tightened.
- Cross-tenant mutation tests for every tenant table beyond patients and
  encounters (the RBAC checks currently cover two representative tables, not
  all 18 role-restricted ones).
- AI endpoint handler tests (currently only helpers are unit-tested; full
  handler behavior is covered via the container smoke test).
- Coverage instrumentation to quantify gaps.

## Running

```bash
npm test                       # full suite
npx vitest run tests/server.test.ts   # a single file
npm run lint                   # typecheck (tsc --noEmit)
npm run verify:rls             # local Supabase RLS/auth verifier
```
