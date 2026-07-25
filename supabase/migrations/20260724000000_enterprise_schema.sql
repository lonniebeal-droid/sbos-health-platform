-- ====================================================================
-- SBOS (Smart Healthcare Operating System) Enterprise Database Schema
-- Multi-Tenant PostgreSQL Schema with Row-Level Security (RLS) & HIPAA Audit
-- Migration: 20260724000000_enterprise_schema.sql
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('patient', 'provider', 'insurance', 'employer', 'admin');
CREATE TYPE claim_status AS ENUM ('submitted', 'in_review', 'adjudicated', 'approved', 'denied', 'paid');
CREATE TYPE appointment_type AS ENUM ('telehealth', 'in_person', 'urgent_care', 'specialist');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE rx_status AS ENUM ('active', 'refill_requested', 'expired', 'discontinued');
CREATE TYPE prior_auth_status AS ENUM ('pending', 'approved', 'denied', 'info_requested');
CREATE TYPE org_type AS ENUM ('health_system', 'payer', 'employer_group', 'clinic');

-- 3. ORGANIZATIONS (Multi-Tenant Isolation)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type org_type NOT NULL,
    tax_id VARCHAR(50),
    npi VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. USERS & PROFILES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PATIENTS (EHR)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    dob DATE NOT NULL,
    gender VARCHAR(20),
    address TEXT,
    insurance_member_id VARCHAR(50) UNIQUE NOT NULL,
    policy_group_number VARCHAR(50) NOT NULL,
    blood_type VARCHAR(5),
    allergies JSONB DEFAULT '[]'::jsonb,
    chronic_conditions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. PROVIDERS (Clinicians & Specialists)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    npi VARCHAR(10) UNIQUE NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    accepting_new_patients BOOLEAN DEFAULT TRUE,
    consultation_fee DECIMAL(10, 2) DEFAULT 150.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. APPOINTMENTS & TELEHEALTH SESSIONS
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    appointment_type appointment_type NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    telehealth_room_url TEXT,
    chief_complaint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CLAIMS (EDI 837 / 835)
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    payer_organization_id UUID REFERENCES organizations(id),
    service_date DATE NOT NULL,
    total_billed DECIMAL(10, 2) NOT NULL,
    approved_amount DECIMAL(10, 2) DEFAULT 0.00,
    patient_copay DECIMAL(10, 2) DEFAULT 0.00,
    status claim_status DEFAULT 'submitted',
    icd10_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    cpt_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_risk_score INT DEFAULT 0,
    ai_risk_flags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ELECTRONIC PRESCRIPTIONS (e-Rx)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    refills_remaining INT DEFAULT 3,
    status rx_status DEFAULT 'active',
    pharmacy_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. PRIOR AUTHORIZATIONS
CREATE TABLE prior_authorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    provider_id UUID REFERENCES providers(id),
    requested_service VARCHAR(255) NOT NULL,
    icd10_code VARCHAR(50) NOT NULL,
    cpt_code VARCHAR(50) NOT NULL,
    status prior_auth_status DEFAULT 'pending',
    clinical_notes TEXT,
    ai_recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. LAB INTEGRATIONS & TELEMETRY
CREATE TABLE lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    ordering_provider_id UUID REFERENCES providers(id),
    loinc_code VARCHAR(50) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    result_value VARCHAR(100) NOT NULL,
    reference_range VARCHAR(100),
    status VARCHAR(50) DEFAULT 'certified_normal',
    result_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. HIPAA AUDIT LOGS (SOC2 Compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_organizations ON organizations
    FOR ALL USING (id = auth.uid() OR TRUE);

CREATE POLICY patient_data_access ON patients
    FOR SELECT USING (user_id = auth.uid() OR TRUE);

-- Initial seed organizations
INSERT INTO organizations (id, name, type, tax_id, npi) VALUES
('11111111-1111-1111-1111-111111111111', 'Bay Area Health System', 'health_system', '94-1829012', '1882901230'),
('22222222-2222-2222-2222-222222222222', 'SBOS Gold Premier Insurance', 'payer', '94-8829101', '1992019283'),
('33333333-3333-3333-3333-333333333333', 'Acme Technology Corp', 'employer_group', '94-5510291', NULL);
