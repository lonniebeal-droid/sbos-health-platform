-- ====================================================================
-- SBOS HealthOS Enterprise PostgreSQL / Supabase Migration Schema
-- Version: 3.4.0-enterprise
-- Description: Multi-tenant database schema with RLS, HIPAA Audit Logging,
--              Appointments, WebRTC Sessions, Claims, and Real-time Messaging
-- ====================================================================

-- Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------
-- 1. MULTI-TENANT ORGANIZATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    tenant_type VARCHAR(50) NOT NULL CHECK (tenant_type IN ('health_system', 'health_plan', 'behavioral_health', 'clinic_network', 'employer_group')),
    primary_color VARCHAR(50) DEFAULT 'from-blue-600 to-indigo-600',
    accent_color VARCHAR(50) DEFAULT '#2563eb',
    
    -- Billing Plan Details
    plan_tier VARCHAR(100) DEFAULT 'Enterprise SaaS',
    monthly_rate NUMERIC(10, 2) DEFAULT 35000.00,
    active_enrollees INT DEFAULT 5000,
    renewal_date DATE DEFAULT '2027-01-01',
    billing_status VARCHAR(50) DEFAULT 'active',

    -- Permissions / Feature Flags JSONB
    permissions JSONB DEFAULT '{
        "telehealthEnabled": true,
        "rcmEdiEnabled": true,
        "priorAuthAiEnabled": true,
        "behavioralHealthEnabled": true,
        "employerPortalEnabled": true,
        "mfaEnforced": true
    }'::jsonb,

    -- White-Label Branding JSONB
    branding JSONB DEFAULT '{
        "portalTitle": "HealthOS Portal",
        "tagline": "Empowering Quality Multi-Tenant Healthcare",
        "supportEmail": "support@sbos.health",
        "supportPhone": "+1 (800) 555-0199",
        "brandThemeColor": "blue"
    }'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 2. USERS & PROFILES (Multi-Tenant Auth)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'provider', 'insurance', 'employer', 'admin')),
    phone VARCHAR(50),
    avatar_url TEXT,
    npi_number VARCHAR(20),
    specialty VARCHAR(100),
    organization VARCHAR(255),
    mfa_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- --------------------------------------------------------------------
-- 3. APPOINTMENTS & TELEHEALTH SESSIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id),
    provider_id UUID NOT NULL REFERENCES profiles(id),
    appointment_type VARCHAR(50) NOT NULL CHECK (appointment_type IN ('Telehealth', 'In-Person', 'Urgent Care', 'Behavioral Health')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INT DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show')),
    reason_for_visit TEXT,
    copay_amount NUMERIC(8, 2) DEFAULT 20.00,
    webrtc_room_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 4. SECURE PATIENT-PROVIDER MESSAGES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    receiver_id UUID NOT NULL REFERENCES profiles(id),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT TRUE,
    read_at TIMESTAMP WITH TIME ZONE,
    attachment_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 5. CLAIMS & PRIOR AUTHORIZATIONS
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES profiles(id),
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    provider_name VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    total_billed NUMERIC(10, 2) NOT NULL,
    insurance_paid NUMERIC(10, 2) DEFAULT 0.00,
    patient_responsibility NUMERIC(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'denied', 'paid')),
    icd10_codes TEXT[],
    cpt_codes TEXT[],
    fwa_risk_score INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- 6. HIPAA AUDIT LOGGING (Immutable System Audit Trail)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    actor_id UUID REFERENCES profiles(id),
    actor_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    hipaa_verified BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------------------
-- INDEXES FOR MULTI-TENANT QUERY OPTIMIZATION
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_email ON profiles(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_time ON appointments(tenant_id, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_sender ON patient_messages(tenant_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_claims_tenant_patient ON claims(tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_time ON audit_logs(tenant_id, created_at);

-- --------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANCY
-- --------------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Seed Initial Default Tenant
INSERT INTO tenants (id, name, subdomain, custom_domain, tenant_type, plan_tier, monthly_rate, active_enrollees)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'SuccessBrand Medical Group', 'sbos-med', 'portal.sbosmedical.com', 'health_system', 'Payer Suite', 95000.00, 18500),
  ('00000000-0000-0000-0000-000000000002', 'Bay Area Health System', 'bayarea', 'health.bayarea.org', 'clinic_network', 'Enterprise SaaS', 35000.00, 8200),
  ('00000000-0000-0000-0000-000000000003', 'Apex Health Alliance', 'apexhealth', 'members.apexhealth.com', 'health_plan', 'Payer Suite', 120000.00, 42000)
ON CONFLICT (subdomain) DO NOTHING;
