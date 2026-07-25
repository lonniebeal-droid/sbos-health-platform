# AI — Jessie (SBOS HealthOS)

"Jessie" is the AI layer. It is **server-side only** (`server.ts`), built on
Google Gemini via `@google/genai`. The browser never holds the AI key; it calls
`/api/ai/*`. Details also in `docs/BACKEND.md`.

## Model & client

- SDK: `@google/genai` v2.x. Model: `GEMINI_MODEL` (default `gemini-2.0-flash`).
- Client is **memoized** (built once, rebuilt only if the key changes) with an
  upstream timeout `GEMINI_TIMEOUT_MS` (default 30 000 ms).
- **No key → demo fallback:** every endpoint returns deterministic sample output
  with `200`, so the UI works offline and CI needs no secret.

## Endpoints & prompt architecture

### `/api/ai/chat` — Care Navigator / Receptionist / Benefits
A base system instruction defines Jessie's persona (HIPAA-appropriate tone, no
definitive diagnoses). The `context` field swaps in a specialized instruction:
- `general_patient` (default) — care navigation, benefits, scheduling.
- `clinical_provider` — differential reasoning, drug interactions, ICD-10/CPT.
- `insurance_admin` — adjudication explanations, fraud breakdown.
- `employer_hr` — plan comparison, enrollment, wellness.
Returns free-text `reply` + `suggestedActions`.

### `/api/ai/clinical-notes` — Clinical documentation
Converts raw dictation into a structured **BIRP** note (Behavior, Intervention,
Response, Plan) plus suggested ICD-10 and CPT codes. Uses
`responseMimeType: application/json`; parsed defensively via `parseJsonLoose`
(tolerates ```json fences).

### `/api/ai/fraud-analysis` — Claims FWA
Scores a claim for Fraud/Waste/Abuse: `riskScore` (0–100), `recommendation`,
`riskFlags`. Low temperature (0.1) for determinism. Same defensive JSON parsing.

## Shared implementation

- `getGeminiClient()` — memoized client factory (exported; unit-tested).
- `generateJson(ai, prompt, temperature)` — shared structured-output call.
- `parseJsonLoose(text)` — robust JSON parse (exported; unit-tested).
- Validation: `chat` prompt ≤ 8000 chars; `clinical-notes` rawNotes ≤ 20000;
  `fraud-analysis` claimData must be a non-null object.
- Errors return generic messages (no internal detail leaks to clients).

## Clinical workflow (current)

1. Provider drafts notes in `ClinicalDocumentation` / `AIClinicalAssistant`.
2. UI calls `/api/ai/clinical-notes`; Gemini returns a BIRP draft + codes.
3. Provider reviews. **Persistence/versioning of AI output is not yet built** —
   drafts are not saved server-side (Phase 4).

## Safety & compliance notes

- Prompts instruct Jessie to avoid definitive diagnoses and defer to licensed
  providers.
- **Endpoints are currently unauthenticated** (rate-limited only). Before real
  PHI, add Supabase-JWT verification — **blocked** on the JWT secret. See
  [SECURITY](SECURITY.md).
- Sending PHI to Gemini requires an appropriate data-processing agreement with
  the model provider — a business/compliance decision.

## Roadmap

- Authentication on AI endpoints (Phase 2, blocked).
- Persist conversations + note versions (Supabase).
- Provider abstraction to allow non-Gemini models.
- Streaming responses for chat.
