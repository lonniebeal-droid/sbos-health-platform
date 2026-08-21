import type { ClaimPaymentRow, ClaimAdjustmentRow, ClaimStatusEventRow, DbClaimStatus } from './db/database.types';

/**
 * Balance math over the normalized claims schema. The claims table only
 * carries `total_charge_cents`; everything paid or written off lives in
 * claim_payments / claim_adjustments, so every dollar figure the UI shows
 * has to be derived here rather than read off a flat column.
 */

export function sumPayments(payments: ClaimPaymentRow[], source?: ClaimPaymentRow['payment_source']): number {
  return payments
    .filter((p) => !source || p.payment_source === source)
    .reduce((sum, p) => sum + p.amount_cents, 0);
}

export function sumAdjustments(adjustments: ClaimAdjustmentRow[]): number {
  return adjustments.reduce((sum, a) => sum + a.amount_cents, 0);
}

/** Total remaining balance on the claim: charge minus every payment minus every adjustment. */
export function calculateClaimBalanceCents(
  totalChargeCents: number,
  payments: ClaimPaymentRow[],
  adjustments: ClaimAdjustmentRow[],
): number {
  return Math.max(0, totalChargeCents - sumPayments(payments) - sumAdjustments(adjustments));
}

/** What the patient still owes: charge minus payer payments minus adjustments minus what the patient already paid. */
export function calculatePatientResponsibilityCents(
  totalChargeCents: number,
  payments: ClaimPaymentRow[],
  adjustments: ClaimAdjustmentRow[],
): number {
  const payerPaid = sumPayments(payments, 'payer');
  const patientPaid = sumPayments(payments, 'patient');
  const adjusted = sumAdjustments(adjustments);
  return Math.max(0, totalChargeCents - payerPaid - adjusted - patientPaid);
}

/**
 * The live schema has no `adjudication_method` column, so whether a paid/
 * denied claim was decided by the automation rules engine or by staff is
 * recorded in the free-text `claim_status_events.reason` with a `[automated]`
 * / `[manual]` prefix (see repositories.ts) and parsed back out here.
 */
export function parseAdjudicationMethod(
  events: ClaimStatusEventRow[],
  status: DbClaimStatus,
): 'automated' | 'manual' | undefined {
  if (status !== 'paid' && status !== 'denied') return undefined;
  const match = events
    .filter((e) => e.to_status === status && (e.reason?.startsWith('[automated]') || e.reason?.startsWith('[manual]')))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  if (!match?.reason) return undefined;
  return match.reason.startsWith('[automated]') ? 'automated' : 'manual';
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
