# SECURITY REVIEW — SBOS HealthOS

Release-lens security review. Deep reference: [`docs/operations/SECURITY.md`](docs/operations/SECURITY.md).
Date: 2026-07-25 · Commit: `453bd8d`.

## Findings & evidence

| # | Finding | Evidence | Risk |
| - | ------- | -------- | ---- |
| S1 | `/api/ai/*` unauthenticated | `server.ts` — no auth middleware on AI routes; only rate limiting | **High** (cost/abuse; PHI exposure if used with real data) |
| S2 | Historical terraform DB password in git history | `git log -p terraform/variables.tf` (removed from tree in `856cf98`) | **High** |
| S3 | No Content-Security-Policy | `server.ts` sets other headers, no `Content-Security-Policy` | Medium |
| S4 | RLS ↔ client-gate parity unverified | ~20 policies in `supabase/migrations`; no cross-check test | Medium |
| S5 | In-memory rate limiter (per-instance) | `rateLimit()` uses a local `Map` | Medium (multi-instance bypass) |
| S6 | No secrets manager | secrets via env; `terraform/main.tf` NOTE | Medium |

## Completed fixes (this engagement, verified)

- Error responses no longer leak internal detail (`a7d3eaf`); correct 4xx vs 5xx (`6df0205`).
- Security headers + per-IP rate limiting + 256 kb body cap (`server.ts`).
- Committed terraform DB password removed; `.env`/tfvars gitignored (`856cf98`).
- Least-privilege CI token `contents: read` (`a09d587`); `npm audit` = **0 vulnerabilities**.
- No service-role key referenced in client code (verified by grep).
- Node 20 (EOL) → 22 LTS (`98fe53e`).

## Deferred work

- CSP header (needs SPA connect/script inventory).
- Systematic audit-log writes; audit viewer.
- MFA.

## Remaining blockers

- Auth on AI endpoints — **Supabase JWT secret** (owner).
- Hosted Supabase + **signed BAA**; Secret Manager; **rotate historical password**.

## Overall risk level

**HIGH for real PHI** until S1, S2, and BAA are resolved. Acceptable for
non-PHI/demo use on a trusted network.
