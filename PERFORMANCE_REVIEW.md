# PERFORMANCE REVIEW — SBOS HealthOS

Release-lens performance review. Date: 2026-07-25 · Commit: `453bd8d`.
Note: no load testing has been performed; findings are from code inspection and
build/runtime observation.

## Findings & evidence

| # | Finding | Evidence | Impact |
| - | ------- | -------- | ------ |
| P1 | Gemini client was reconstructed per request | prior `getGeminiClient()` returned `new GoogleGenAI()` each call | **Fixed** — now memoized (`55f26f4`) |
| P2 | No upstream AI timeout (hung calls hold requests) | no timeout on `generateContent` | **Fixed** — `GEMINI_TIMEOUT_MS` (`55f26f4`) |
| P3 | Duplicated AI call/parse paths | two handlers repeated generateContent+parse | **Fixed** — `generateJson()` (`7acd3a1`) |
| P4 | Few DB indexes on hot paths | only 3 explicit indexes across migrations | Deferred — matters at scale (claims by payer/status, appts by provider/date) |
| P5 | In-memory rate-limit map growth | `rateLimit()` Map with opportunistic cleanup >5000 | Low — bounded; single-instance |
| P6 | Frontend bundle size not analyzed | `vite build` succeeds; no bundle budget | Deferred |

## Evidence — build/runtime

- Production build: `vite build` + `esbuild` succeed; server bundle ~12 kb.
- Container image: ~457 MB (Node 22 alpine, prod-deps only).
- Request logging emits per-request latency (`[SBOS] METHOD URL STATUS ms`).

## Completed fixes (verified)

- P1, P2, P3 above — unit-tested (client memoization, JSON parsing) and
  container-verified; 52 tests pass.

## Deferred work

- Add hot-path DB indexes (P4).
- Load-test AI endpoints; set a frontend bundle budget.
- Consider response streaming for `/api/ai/chat`.

## Remaining blockers

- Realistic load testing needs a hosted environment + representative data.

## Overall risk level

**LOW at current (demo/low) data volumes.** Medium once real tenant data and
concurrency arrive without the deferred indexing and load testing.
