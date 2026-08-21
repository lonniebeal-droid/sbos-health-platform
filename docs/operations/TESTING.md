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
| `scripts/verify-rls.sh` | n/a | database | local Supabase RLS/auth mapping, profile hardening, and audit-log immutability |
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
   plus a local reset; proves auth-to-org mapping, rejected signup/profile
   escalation, cross-tenant patient isolation, and append-only audit-log behavior
   against the seeded DB.
4. **Typecheck as a gate** — `tsc --noEmit` in CI.

## Notable gaps / remaining tests

- Component tests for the portals (needs jsdom + a component testing setup).
- Broader Supabase integration coverage beyond the seeded auth/org + patient/audit
  cases in `scripts/verify-rls.sh`.
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
