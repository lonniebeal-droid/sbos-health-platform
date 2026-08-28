import type { Claim, ClaimStatus, DenialCode } from '../types';

/**
 * Deterministic claims-automation rules engine.
 *
 * Real, rule-based logic — not an LLM call and not decorative copy. Kept
 * intentionally simple and auditable: a payer needs to be able to point to
 * the exact rule that auto-adjudicated a claim.
 */

export const AUTOMATION_RULES = {
  /** Claims at or below this risk score are eligible for automation. */
  autoApproveRiskThreshold: 15,
  /** Claims billed at or below this amount are eligible for automation. */
  autoApproveBilledCap: 1000,
  /** Claims at or above this risk score are always routed to manual review. */
  manualReviewRiskThreshold: 60,
} as const;

export const DENIAL_REASONS: Record<DenialCode, { label: string; followUp: string }> = {
  MISSING_DOCS: {
    label: 'Missing supporting documentation',
    followUp: 'Notify provider to submit chart notes and re-file within 30 days.',
  },
  DUPLICATE_CLAIM: {
    label: 'Duplicate of a previously adjudicated claim',
    followUp: 'No action needed unless provider disputes — link to original claim for reference.',
  },
  NOT_COVERED: {
    label: 'Service not covered under the member’s plan',
    followUp: 'Send plan-language EOB citation to member and provider; no resubmission expected.',
  },
  CODING_ERROR: {
    label: 'Invalid or mismatched procedure/diagnosis code combination',
    followUp: 'Request corrected CPT/ICD-10 coding from provider and re-file.',
  },
  OUT_OF_NETWORK: {
    label: 'Provider is out-of-network for this plan',
    followUp: 'Offer in-network alternative list to member; provider may appeal with network exception request.',
  },
  PRIOR_AUTH_REQUIRED: {
    label: 'Required prior authorization was not on file',
    followUp: 'Route to Prior Authorization queue for retroactive review before re-adjudicating.',
  },
  OTHER: {
    label: 'Other — see adjuster notes',
    followUp: 'Adjuster to document specific reason and next step manually.',
  },
};

export type RecommendedAction = 'auto_approve' | 'manual_review' | 'no_action';

export interface ClaimClassification {
  recommendedAction: RecommendedAction;
  reason: string;
}

// 'draft'/'ready' are live-schema pre-submission statuses; 'adjudicated' is kept for the
// offline demo dataset only (see the ClaimStatus comment in types.ts).
const OPEN_STATUSES: ClaimStatus[] = ['draft', 'ready', 'submitted', 'in_review', 'adjudicated'];

/** Classifies an open claim for automated routing. */
export function classifyClaim(claim: Pick<Claim, 'aiRiskScore' | 'totalBilled' | 'status'>): ClaimClassification {
  if (!OPEN_STATUSES.includes(claim.status)) {
    return { recommendedAction: 'no_action', reason: 'Claim already has a final decision (paid or denied).' };
  }

  if (claim.aiRiskScore >= AUTOMATION_RULES.manualReviewRiskThreshold) {
    return {
      recommendedAction: 'manual_review',
      reason: `Risk score ${claim.aiRiskScore} is at or above the manual-review threshold (${AUTOMATION_RULES.manualReviewRiskThreshold}).`,
    };
  }

  if (
    claim.aiRiskScore <= AUTOMATION_RULES.autoApproveRiskThreshold &&
    claim.totalBilled <= AUTOMATION_RULES.autoApproveBilledCap
  ) {
    return {
      recommendedAction: 'auto_approve',
      reason: `Risk score ${claim.aiRiskScore} ≤ ${AUTOMATION_RULES.autoApproveRiskThreshold} and billed amount $${claim.totalBilled.toFixed(2)} ≤ $${AUTOMATION_RULES.autoApproveBilledCap} auto-approval cap.`,
    };
  }

  return {
    recommendedAction: 'manual_review',
    reason: `Risk score ${claim.aiRiskScore} or billed amount $${claim.totalBilled.toFixed(2)} falls outside auto-approval limits.`,
  };
}

/** Staff-facing "what should I do about this claim" recommendation. */
export function getNextStepRecommendation(claim: Claim): string {
  if (claim.status === 'paid') {
    return claim.adjudicationMethod === 'automated'
      ? 'No action needed — auto-adjudicated and paid.'
      : 'No action needed — paid.';
  }
  if (claim.status === 'denied') {
    const code = claim.denialCode ?? 'OTHER';
    // Guard: DB denial_code is a free-form string cast via `as DenialCode` in
    // mappers.ts — values not present in DENIAL_REASONS must not crash.
    const entry = DENIAL_REASONS[code] ?? DENIAL_REASONS.OTHER;
    return entry.followUp;
  }
  const classification = classifyClaim(claim);
  if (classification.recommendedAction === 'auto_approve') {
    return 'Eligible for automatic approval — will process on the next automation pass.';
  }
  if (classification.recommendedAction === 'manual_review') {
    return `Needs adjuster review: ${classification.reason}`;
  }
  return 'No action needed.';
}

export { type DenialCode };
