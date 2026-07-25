# SBOS HealthOS — Jessie AI

Jessie is the platform's AI layer, backed by **Google Gemini** through the Express
server proxy (`/api/ai/*`, backend lane) so the API key never reaches the browser.

## Current capabilities (implemented)
- **Assistant chat** (`/api/ai/chat`) — role-aware system prompts (patient / clinical
  provider / insurance admin / employer). UI: `AIAssistantWidget`.
- **Clinical BIRP generation** (`/api/ai/clinical-notes`) — raw dictation → structured
  BIRP + suggested ICD-10/CPT. UI: `ClinicalDocumentation` (result is signed +
  persisted to `clinical_notes`).
- **Claims FWA analysis** (`/api/ai/fraud-analysis`) — risk score + flags. UI:
  `InsuranceClaimsCenter`.
- **Benefits / eligibility explanation** — plain-English coverage answers.
  UI: `BenefitsExplainer`, employer advisor.

## Prompt architecture
- System instruction selected by `context` (general_patient, clinical_provider,
  insurance_admin, employer_hr).
- Model configurable via `GEMINI_MODEL` (default `gemini-2.0-flash`); temperature
  tuned per task (low for coding/FWA, moderate for chat).
- JSON-mode responses for structured outputs (BIRP note, FWA result).
- Guardrail in the base prompt: never give definitive diagnoses; recommend a
  licensed provider.

## Gaps / not yet real
- **No conversation persistence** — chat is stateless per request.
- **No live chart-context retrieval** — prompts don't yet pull the patient's real
  record from Supabase; outputs are from the user-provided text only.
- No treatment-recommendation engine grounded in the chart; no voice.

## Roadmap (Phase 4)
1. **Persistence:** `ai_conversations` + `ai_messages` tables (RLS: owner + org),
   a `jessieService` to read/write them.
2. **Context retrieval:** a service that assembles a minimal, RLS-safe chart
   summary (problems, meds, recent notes, last vitals) and injects it into prompts.
3. **Patient/chart summaries:** provider one-click "summarize chart" from live data.
4. **Treatment recommendations:** grounded suggestions with citations to the chart;
   always provider-reviewed, never auto-applied.
5. **Documentation assistance:** SOAP/progress note drafting; coding assist.
6. **Voice workflow prep:** transcription hook (dictation → note), provider-gated.

## Safety / compliance notes
- AI runs server-side; keys via env. When chart data is fed to the model, treat it
  as PHI: minimize what's sent, log the access (audit), and require a signed BAA
  with the model provider before real PHI (owner responsibility). Until then, use
  synthetic/seed data only.
