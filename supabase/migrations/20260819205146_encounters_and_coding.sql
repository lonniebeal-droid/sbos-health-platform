CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    encounter_date DATE NOT NULL,
    encounter_type TEXT NOT NULL
        CHECK (encounter_type IN ('office_visit', 'telehealth', 'follow_up', 'initial_intake', 'urgent_care', 'other')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_progress', 'completed', 'signed', 'cancelled')),
    chief_complaint TEXT,
    notes_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encounters_organization ON encounters(organization_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);

CREATE TABLE IF NOT EXISTS diagnosis_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    code_system TEXT NOT NULL DEFAULT 'ICD-10',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_codes_organization ON diagnosis_codes(organization_id);

CREATE TABLE IF NOT EXISTS procedure_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    code_system TEXT NOT NULL DEFAULT 'CPT',
    default_charge_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_procedure_codes_organization ON procedure_codes(organization_id);

CREATE TABLE IF NOT EXISTS encounter_diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    diagnosis_code_id UUID NOT NULL REFERENCES diagnosis_codes(id) ON DELETE RESTRICT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (encounter_id, diagnosis_code_id)
);

CREATE INDEX IF NOT EXISTS idx_encounter_diagnoses_encounter ON encounter_diagnoses(encounter_id);

CREATE TABLE IF NOT EXISTS encounter_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
    procedure_code_id UUID NOT NULL REFERENCES procedure_codes(id) ON DELETE RESTRICT,
    units INTEGER NOT NULL DEFAULT 1,
    charge_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_encounter_procedures_encounter ON encounter_procedures(encounter_id);
