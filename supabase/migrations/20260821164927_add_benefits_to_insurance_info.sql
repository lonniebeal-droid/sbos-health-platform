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
