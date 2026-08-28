import { describe, it, expect } from 'vitest';
import { classifyClaim, getNextStepRecommendation, AUTOMATION_RULES, DENIAL_REASONS } from '../lib/claimsAutomation';
import type { Claim } from '../types';

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'clm-1',
    claimNumber: 'CLM-1',
    patientName: 'Test Patient',
    patientId: 'pat-1',
    providerName: 'Test Provider',
    providerNpi: '1234567890',
    serviceDate: '2026-08-01',
    submittedDate: '2026-08-01',
    diagnosisCodes: [],
    procedureCodes: [],
    totalBilled: 100,
    planCoveredAmount: 80,
    patientResponsibility: 20,
    status: 'submitted',
    aiRiskScore: 5,
    aiRiskFlags: [],
    plainEnglishExplanation: '',
    ...overrides,
  };
}

describe('classifyClaim', () => {
  it('auto-approves a low-risk, low-dollar open claim', () => {
    const c = classifyClaim(claim({ aiRiskScore: 5, totalBilled: 200, status: 'submitted' }));
    expect(c.recommendedAction).toBe('auto_approve');
  });

  it('routes a high-risk claim to manual review regardless of amount', () => {
    const c = classifyClaim(
      claim({ aiRiskScore: AUTOMATION_RULES.manualReviewRiskThreshold, totalBilled: 1, status: 'in_review' }),
    );
    expect(c.recommendedAction).toBe('manual_review');
  });

  it('routes a low-risk but high-dollar claim to manual review, not auto-approve', () => {
    const c = classifyClaim(
      claim({ aiRiskScore: 5, totalBilled: AUTOMATION_RULES.autoApproveBilledCap + 1, status: 'submitted' }),
    );
    expect(c.recommendedAction).toBe('manual_review');
  });

  it('treats adjudicated (not just submitted/in_review) as still open for routing', () => {
    const c = classifyClaim(claim({ aiRiskScore: 5, totalBilled: 50, status: 'adjudicated' }));
    expect(c.recommendedAction).toBe('auto_approve');
  });

  it('returns no_action for an already-decided claim', () => {
    const paid = classifyClaim(claim({ aiRiskScore: 5, totalBilled: 50, status: 'paid' }));
    const denied = classifyClaim(claim({ aiRiskScore: 90, totalBilled: 50, status: 'denied' }));
    expect(paid.recommendedAction).toBe('no_action');
    expect(denied.recommendedAction).toBe('no_action');
  });

  it('boundary: exactly at both thresholds still auto-approves (inclusive)', () => {
    const c = classifyClaim(
      claim({
        aiRiskScore: AUTOMATION_RULES.autoApproveRiskThreshold,
        totalBilled: AUTOMATION_RULES.autoApproveBilledCap,
        status: 'submitted',
      }),
    );
    expect(c.recommendedAction).toBe('auto_approve');
  });
});

describe('getNextStepRecommendation', () => {
  it('reports auto-adjudicated claims as no action needed, distinguishing method', () => {
    const auto = getNextStepRecommendation(claim({ status: 'paid', adjudicationMethod: 'automated' }));
    const manual = getNextStepRecommendation(claim({ status: 'paid', adjudicationMethod: 'manual' }));
    expect(auto).toContain('auto-adjudicated');
    expect(manual).not.toContain('auto-adjudicated');
  });

  it('surfaces the denial follow-up text for the recorded denial code', () => {
    const step = getNextStepRecommendation(claim({ status: 'denied', denialCode: 'MISSING_DOCS' }));
    expect(step).toBe(DENIAL_REASONS.MISSING_DOCS.followUp);
  });

  it('falls back to OTHER follow-up when a denied claim has no code on record', () => {
    const step = getNextStepRecommendation(claim({ status: 'denied', denialCode: undefined }));
    expect(step).toBe(DENIAL_REASONS.OTHER.followUp);
  });

  it('falls back to OTHER follow-up for an unknown denial code (e.g. CO-4) without crashing', () => {
    const step = getNextStepRecommendation(claim({ status: 'denied', denialCode: 'CO-4' as any }));
    expect(step).toBe(DENIAL_REASONS.OTHER.followUp);
  });

  it('tells staff an eligible open claim will auto-process', () => {
    const step = getNextStepRecommendation(claim({ status: 'submitted', aiRiskScore: 5, totalBilled: 50 }));
    expect(step).toContain('automatic approval');
  });
});
