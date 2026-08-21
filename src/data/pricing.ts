/**
 * HealthOS payer/claims pricing & positioning configuration.
 *
 * IMPORTANT: the `industryComparison` figures below are ILLUSTRATIVE RANGES
 * describing common claims-clearinghouse / claims-processing fee structures
 * in general terms. They are not sourced from verified competitor pricing
 * and must not be presented to a customer as fact — replace them with real,
 * sourced figures (or remove the comparison) before using this in sales
 * material. Every field here is intentionally configurable rather than
 * hardcoded into the UI so the real numbers can be dropped in later.
 */

export interface PricingTier {
  id: string;
  name: string;
  /** Per-claim processing fee, in USD. */
  perClaimFee: number;
  /** Monthly platform/access fee, in USD. */
  monthlyPlatformFee: number;
  description: string;
  includedFeatures: string[];
}

export const healthOsPricing: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter Payer',
    perClaimFee: 0.35,
    monthlyPlatformFee: 500,
    description: 'For small payers or TPAs processing under 5,000 claims/month.',
    includedFeatures: [
      'Real Supabase-backed claims queue and adjudication workspace',
      'Rule-based auto-approval for low-risk, low-dollar claims',
      'Structured denial reasons with automatic follow-up guidance',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Payer',
    perClaimFee: 0.22,
    monthlyPlatformFee: 2500,
    description: 'For payers processing 5,000–50,000 claims/month.',
    includedFeatures: [
      'Everything in Starter',
      'Configurable auto-approval thresholds',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Payer',
    perClaimFee: 0.12,
    monthlyPlatformFee: 12000,
    description: 'For payers processing 50,000+ claims/month, custom SLAs.',
    includedFeatures: [
      'Everything in Growth',
      'Custom automation rule sets per line of business',
      'Dedicated implementation & account team',
    ],
  },
];

export interface IndustryComparisonPoint {
  metric: string;
  healthOs: string;
  /** Illustrative — see file-level note. Not verified competitor data. */
  typicalAlternative: string;
}

export const industryComparison: IndustryComparisonPoint[] = [
  {
    metric: 'Per-claim processing fee',
    healthOs: '$0.12–$0.35 depending on volume tier',
    typicalAlternative: 'Commonly $0.35–$1.00+ per claim at legacy clearinghouses (illustrative range — verify before quoting)',
  },
  {
    metric: 'Low-risk claim turnaround',
    healthOs: 'Minutes (rule-based auto-approval)',
    typicalAlternative: 'Often 3–10 business days where adjudication is manual-first',
  },
  {
    metric: 'Staff effort per clean claim',
    healthOs: 'Zero — auto-routed and auto-paid, staff only touches flagged claims',
    typicalAlternative: 'Typically reviewed by an adjuster regardless of risk',
  },
  {
    metric: 'Denial next steps',
    healthOs: 'Generated automatically per denial code',
    typicalAlternative: 'Frequently left to adjuster judgment/memory',
  },
];

export const pricingDisclaimer =
  'Pricing tiers are HealthOS-configurable starting points, not final rate-card commitments. ' +
  'Industry comparison figures are illustrative ranges for common clearinghouse/claims-processing ' +
  'fee structures and are not sourced from verified competitor pricing — confirm real figures before ' +
  'using this in a customer-facing quote.';
