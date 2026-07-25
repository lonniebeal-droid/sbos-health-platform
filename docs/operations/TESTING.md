# TESTING — SBOS HealthOS

Runner: **Vitest** (node environment, default config — no `vitest.config.ts`;
`test` glob is `**/*.test.ts`). Run with `npm test`.

## Current test inventory (52 tests, 4 files)

| File | Tests | Lane | Covers |
| ---- | ----- | ---- | ------ |
| `src/tests/mappers.test.ts` | 19 | frontend | row → domain type mapping |
| `src/tests/permissions.test.ts` | 14 | frontend | RBAC matrix / access gates |
| `src/tests/dataLayer.test.ts` | 8 | frontend | repository/data-layer behavior |
| `tests/server.test.ts` | 11 | backend | rate limiter, Gemini client memoization, JSON parser |
| **Total** | **52** | | |

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
3. **Typecheck as a gate** — `tsc --noEmit` in CI.

## Notable gaps / remaining tests

- Component tests for the portals (needs jsdom + a component testing setup).
- Integration tests that sign in and assert **RLS per role** against a running
  Supabase (Phase 1).
- AI endpoint handler tests (currently only helpers are unit-tested; full
  handler behavior is covered via the container smoke test).
- Coverage instrumentation to quantify gaps.

## Running

```bash
npm test                       # full suite
npx vitest run tests/server.test.ts   # a single file
npm run lint                   # typecheck (tsc --noEmit)
```
