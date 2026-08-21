CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE RESTRICT,
    insurance_info_id UUID NOT NULL REFERENCES insurance_info(id) ON DELETE RESTRICT,
    claim_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'ready', 'submitted', 'in_review', 'paid', 'denied', 'void')),
    total_charge_cents INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    denied_at TIMESTAMPTZ,
    denial_reason TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, claim_number)
);

CREATE INDEX IF NOT EXISTS idx_claims_organization ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_patient ON claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_encounter ON claims(encounter_id);

CREATE TABLE IF NOT EXISTS claim_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    encounter_procedure_id UUID NOT NULL REFERENCES encounter_procedures(id) ON DELETE RESTRICT,
    procedure_code TEXT NOT NULL,
    procedure_description TEXT NOT NULL,
    units INTEGER NOT NULL,
    charge_cents INTEGER NOT NULL,
    line_total_cents INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied')),
    denial_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_lines_claim ON claim_lines(claim_id);

CREATE TABLE IF NOT EXISTS claim_status_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_status_events_claim ON claim_status_events(claim_id);
