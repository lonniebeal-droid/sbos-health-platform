-- SBOS HealthOS — proposed: benefits/deductible tracking on insurance_info
-- Migration: 20260821000600_add_benefits_to_insurance_info.sql
--
-- PROPOSED — NOT APPLIED. Written for review; apply only after explicit
-- confirmation.
--
-- The old flat schema had a separate `benefits_plans` table, but a benefit
-- plan's deductible/OOP figures are 1:1 attributes of one patient's coverage
-- record, not a distinct list — the live `insurance_info` table already
-- carries that patient's payer/plan identity (payer_name, plan_name,
-- member_id, group_number, coverage dates, status). Extending it here is a
-- smaller, more normalized addition than a whole new table with a redundant
-- patient/plan link. Amounts are stored in cents, matching claims/payments
-- convention elsewhere in this schema (see claims.total_charge_cents).

ALTER TABLE public.insurance_info
  ADD COLUMN network_type text
    CHECK (network_type IS NULL OR network_type = ANY (ARRAY['PPO', 'HMO', 'EPO']::text[])),
  ADD COLUMN individual_deductible_cents integer,
  ADD COLUMN deductible_met_cents integer,
  ADD COLUMN out_of_pocket_max_cents integer,
  ADD COLUMN out_of_pocket_met_cents integer,
  ADD COLUMN copays jsonb;

COMMENT ON COLUMN public.insurance_info.copays IS
  'Per-service-type copay amounts in cents, e.g. {"primaryCare": 2000, "specialist": 4500, "urgentCare": 5000, "emergencyRoom": 25000, "genericRx": 1000}. Null until populated.';
