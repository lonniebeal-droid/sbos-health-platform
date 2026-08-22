CREATE TABLE IF NOT EXISTS claim_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    claim_line_id UUID REFERENCES claim_lines(id) ON DELETE SET NULL,
    payment_source TEXT NOT NULL CHECK (payment_source IN ('payer', 'patient', 'other')),
    payment_method TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    reference_number TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    posted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_payments_claim ON claim_payments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_payments_organization ON claim_payments(organization_id);

CREATE TABLE IF NOT EXISTS claim_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    claim_line_id UUID REFERENCES claim_lines(id) ON DELETE SET NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('contractual', 'write_off', 'correction', 'refund', 'other')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    reason TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_adjustments_claim ON claim_adjustments(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_adjustments_organization ON claim_adjustments(organization_id);

CREATE TABLE IF NOT EXISTS claim_denials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    claim_line_id UUID REFERENCES claim_lines(id) ON DELETE SET NULL,
    denial_code TEXT,
    denial_reason TEXT NOT NULL,
    denied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_denials_claim ON claim_denials(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_denials_organization ON claim_denials(organization_id);
