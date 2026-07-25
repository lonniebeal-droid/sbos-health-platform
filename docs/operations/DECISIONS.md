# DECISIONS — SBOS HealthOS (ADR log)

Important architectural decisions, why they were chosen, alternatives rejected,
and date. Newest first. Anchors (`#d1`, …) are referenced from other docs.

## <a id="d1"></a>D1 — Two-lane, file-isolated concurrent development
- **Date:** 2026-07-24
- **Decision:** Split work into a backend/infra lane (`server.ts`, Docker, CI,
  terraform, scripts, docs) and a frontend/Supabase lane (`src/`, `supabase/`),
  with no shared-file edits, to allow two agents to work concurrently without
  clobbering each other.
- **Why:** eliminates merge conflicts and accidental overwrites between sessions.
- **Rejected:** single-lane serialized work (slower); feature branches per agent
  then merge (more conflict surface on shared files like `package.json`).

## <a id="d2"></a>D2 — Client reads Supabase directly; backend is thin
- **Date:** pre-2026-07-24 (ratified during endpoint cleanup)
- **Decision:** The SPA uses `supabase-js` (Auth + PostgREST) directly for data;
  the Express server only handles AI + health/OpenAPI + static hosting.
- **Why:** Supabase already provides authenticated, RLS-enforced data access; a
  duplicate REST layer added no value and had drifted into fabricated stubs.
- **Rejected:** a full custom REST/BFF layer (removed — it was fake and unused).

## <a id="d3"></a>D3 — Remove fabricated backend endpoints
- **Date:** 2026-07-25
- **Decision:** Delete `/api/{auth,tenants,appointments,messages,telehealth,
  billing,notifications,storage,audit,analytics,graphql}` (returned hard-coded
  literals) and keep only real endpoints.
- **Why:** fabricated endpoints mislead consumers and rot; the client never used
  them.
- **Rejected:** implementing them for real now (premature; data path is Supabase).

## <a id="d4"></a>D4 — Hand-rolled security middleware (no helmet)
- **Date:** 2026-07-25
- **Decision:** Set security headers and rate limiting directly rather than add
  `helmet`/a rate-limit package.
- **Why:** the needed subset is small; avoids a dependency for a single-file
  server.
- **Rejected:** helmet + express-rate-limit (heavier deps for marginal gain at
  this size). Revisit if the middleware grows.

## <a id="d5"></a>D5 — Data plane: Supabase vs GCP Cloud SQL (UNRESOLVED)
- **Date:** open
- **Decision:** **Undecided.** The app runs on Supabase; `terraform/` sketches
  GCP Cloud Run + Cloud SQL, which would duplicate the data plane.
- **Why it matters:** shipping both is contradictory; one must be chosen.
- **Status:** terraform is **not applied**; treat it as a sketch until an owner
  decides. See [KNOWN_ISSUES #15](KNOWN_ISSUES.md).

## <a id="d6"></a>D6 — AI is server-side, provider-abstracted, with demo fallback
- **Date:** pre-2026-07-24
- **Decision:** Gemini calls happen only on the server; without a key the
  endpoints return deterministic demo data.
- **Why:** keeps the API key out of the browser; lets the UI and CI run without
  secrets.
- **Rejected:** client-side model calls (leaks keys); hard-failing without a key
  (breaks local/CI).

## <a id="d7"></a>D7 — Node 22 LTS; single container serves SPA + API
- **Date:** 2026-07-25
- **Decision:** Pin Node 22 (Node 20 reached EOL); one multi-stage image serves
  both the built SPA and the API.
- **Why:** supported runtime; simplest deploy unit.
- **Rejected:** Node 20 (EOL); separate frontend/api services (unneeded at this
  scale).

## <a id="d8"></a>D8 — CI verifies the runtime contract via a docker smoke test
- **Date:** 2026-07-25
- **Decision:** CI builds the image, boots it, and asserts status codes
  (200/404/400/413) against the running container.
- **Why:** the error-handler and routing contract can't be fully unit-tested
  in-process (handlers register inside `startServer`); a real container is the
  reliable gate.
- **Rejected:** relying only on unit tests (misses integration/runtime bugs).
