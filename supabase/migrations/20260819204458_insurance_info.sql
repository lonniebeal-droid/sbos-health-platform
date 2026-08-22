CREATE TABLE IF NOT EXISTS insurance_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payer_name TEXT NOT NULL,
    plan_name TEXT,
    member_id TEXT NOT NULL,
    group_number TEXT,
    policy_holder_name TEXT,
    relationship_to_patient TEXT NOT NULL DEFAULT 'self'
        CHECK (relationship_to_patient IN ('self', 'spouse', 'child', 'other')),
    coverage_start_date DATE,
    coverage_end_date DATE,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'pending', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_info_organization ON insurance_info(organization_id);
CREATE INDEX IF NOT EXISTS idx_insurance_info_patient ON insurance_info(patient_id);
