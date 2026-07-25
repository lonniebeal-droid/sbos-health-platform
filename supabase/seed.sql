-- ====================================================================
-- SBOS — LOCAL DEV SEED (applied by `supabase db reset` / first `supabase start`)
--
-- ⚠️ LOCAL TEST DATA ONLY. Fake credentials — never use in shared/production.
-- All test users share the password:  Password123!
--
--   provider@bayarea.test   provider   Bay Area Health System
--   patient@bayarea.test    patient    Bay Area Health System
--   payer@sbospremier.test  insurance  SBOS Gold Premier Insurance
--   admin@bayarea.test      admin      Bay Area Health System
--
-- Organizations are inserted by the enterprise migration:
--   11111111-...-111111111111  Bay Area Health System   (health_system)
--   22222222-...-222222222222  SBOS Gold Premier Insurance (payer)
--   33333333-...-333333333333  Acme Technology Corp     (employer_group)
-- ====================================================================

-- Supabase Auth users. The handle_new_user() trigger auto-creates the matching
-- public.users profile from raw_user_meta_data (full_name / role / organization_id).
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated','provider@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Dr. James Wilson','role','provider','organization_id','11111111-1111-1111-1111-111111111111'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated','patient@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Sarah Jenkins','role','patient','organization_id','11111111-1111-1111-1111-111111111111'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000003','authenticated','authenticated','payer@sbospremier.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Elena Rostova','role','insurance','organization_id','22222222-2222-2222-2222-222222222222'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated','admin@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Devon Sterling','role','admin','organization_id','11111111-1111-1111-1111-111111111111'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000005','authenticated','authenticated','employer@acme.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Marcus Vance','role','employer','organization_id','33333333-3333-3333-3333-333333333333'),now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- Email identities (required by GoTrue for password sign-in).
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000001','email','provider@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000002','email','patient@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000003','email','payer@sbospremier.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000004','email','admin@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000005',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000005','email','employer@acme.test'),'email',now(),now(),now())
ON CONFLICT DO NOTHING;

-- Domain rows (profiles were auto-created by the trigger above).
INSERT INTO public.providers (id, user_id, organization_id, npi, specialty, license_number, accepting_new_patients, consultation_fee, full_name, rating, review_count, in_network, hospital_affiliation, address, phone, next_available_slot, bio, education)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '1982736410', 'Internal Medicine & Primary Care', 'CA-MD-88213', true, 175.00,
   'Dr. James Wilson, MD', 4.9, 184, true, 'Stanford Health Care / SBOS Medical Center',
   '500 Parnassus Ave, Suite 300, San Francisco, CA', '(415) 555-0192', 'Tomorrow at 10:00 AM',
   'Board-certified internist with 14 years of experience in preventive health and chronic disease management.',
   'Harvard Medical School (MD), Residency at Johns Hopkins Hospital'),
  ('b0000000-0000-0000-0000-000000000002', NULL, '11111111-1111-1111-1111-111111111111',
   '1482930192', 'Behavioral Health & Clinical Psychology', 'CA-PSY-40192', true, 160.00,
   'Dr. Amara Patel, PsyD', 5.0, 230, true, 'SBOS Mind Care Center',
   '120 Montgomery St, San Francisco, CA', '(415) 555-0841', 'Friday at 2:30 PM',
   'Specializes in CBT, stress resilience, and evidence-based mental healthcare for working professionals.',
   'Stanford University (PsyD in Clinical Psychology)'),
  ('b0000000-0000-0000-0000-000000000003', NULL, '11111111-1111-1111-1111-111111111111',
   '1839201948', 'Cardiology & Vascular Health', 'CA-MD-19483', true, 220.00,
   'Dr. Chloe Bennett, MD', 4.8, 142, true, 'UCSF Medical Center',
   '400 Castro St, San Francisco, CA', '(415) 555-0482', 'Monday at 9:00 AM',
   'Fellowship-trained cardiologist focusing on preventive cardiology, lipidology, and non-invasive cardiac imaging.',
   'Columbia University Vagelos College of Physicians and Surgeons')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, user_id, organization_id, dob, gender, address, insurance_member_id, policy_group_number, blood_type, allergies, chronic_conditions, recent_vitals, family_members, primary_care_physician)
VALUES ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
        '1988-04-12', 'Female', '742 Evergreen Terrace, San Francisco, CA 94107', 'SBOS-98421092', 'SBOS-GOLD-PPO-2026', 'A+',
        '["Penicillin","Peanuts","Latex"]'::jsonb, '["Mild Asthma","Essential Hypertension"]'::jsonb,
        '{"bloodPressure":"118/76","heartRate":72,"spO2":99,"weightLbs":142,"date":"2026-07-20"}'::jsonb,
        '[{"id":"fm_001","name":"David Jenkins","relation":"Spouse","dob":"1986-09-18"},{"id":"fm_002","name":"Leo Jenkins","relation":"Child","dob":"2018-02-04"}]'::jsonb,
        'Dr. James Wilson, MD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, patient_id, provider_id, organization_id, appointment_type, status, scheduled_at, telehealth_room_url, chief_complaint)
VALUES ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'telehealth', 'scheduled', '2026-07-28T10:00:00Z',
        'https://sbos.health/meet/room-v721', 'Annual wellness check & bloodwork review')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prescriptions (id, patient_id, provider_id, organization_id, medication_name, dosage, frequency, refills_remaining, status, pharmacy_name)
VALUES ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'Lisinopril', '10 mg Tablet', 'Take 1 tablet daily by mouth', 3, 'active',
        'Walgreens Pharmacy - #1402 Castro St')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prior_authorizations (id, patient_id, provider_id, organization_id, requested_service, icd10_code, cpt_code, status, clinical_notes, ai_recommendation)
VALUES
  ('aa000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Cardiac MRI with Contrast', 'I25.10', '75561', 'approved',
   'Persistent atypical angina despite medication; prior echo showed minor ejection fraction variance.',
   'Approve: documentation meets InterQual criteria for chest pain evaluation with inconclusive EKG.'),
  ('aa000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Intensive Outpatient Therapy (IOP)', 'F41.1', '90837', 'pending',
   'Weekly CBT showed moderate gains; step-up intensive care requested to avoid hospital admission.',
   'Recommend approval: GAD refractory to 12 weeks standard weekly therapy.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medical_records (id, patient_id, organization_id, record_date, type, title, doctor, facility, summary, status)
VALUES
  ('ab000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '2026-07-15', 'Lab Result', 'Comprehensive Metabolic Panel & Lipid Profile', 'Dr. James Wilson, MD', 'SBOS Diagnostic Labs',
   'Total Cholesterol: 185 mg/dL (Normal). Fasting Glucose: 92 mg/dL (Normal). Electrolytes within optimal ranges.', 'normal'),
  ('ab000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '2026-06-10', 'Immunization', 'Tdap Booster & Annual Influenza Vaccine', 'Dr. James Wilson, MD', 'Primary Care Network Clinic',
   'Administered in left deltoid. No adverse reaction observed during 15-min post-vaccine monitoring window.', 'normal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.benefits_plans (id, patient_id, organization_id, plan_id, plan_name, network_type, individual_deductible, deductible_met, out_of_pocket_max, out_of_pocket_met, copays)
VALUES ('ac000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        'SBOS-GOLD-PPO-2026', 'Gold Premier PPO Health Plan', 'PPO', 1500.00, 1250.00, 4500.00, 1680.00,
        '{"primaryCare":20,"specialist":45,"urgentCare":50,"emergencyRoom":250,"genericRx":10}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Employer group (Acme, org 3333) + census roster.
INSERT INTO public.employer_groups (id, organization_id, company_name, group_number, active_enrollees, plan_type, monthly_premium_total, renewal_date, wellness_participation_rate, status)
VALUES ('ad000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333',
        'Acme Technology Corp', 'ACME-88390', 142, 'Gold Premier PPO + MindCare', 840500.00, '2027-01-01', 84, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employer_members (id, employer_group_id, organization_id, full_name, job_role, plan, status, dependents, premium_monthly)
VALUES
  ('ae000000-0000-0000-0000-000000000001', 'ad000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Sarah Jenkins', 'Staff Software Engineer', 'SBOS Gold Premier PPO', 'Enrolled', 2, 620),
  ('ae000000-0000-0000-0000-000000000002', 'ad000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Marcus Vance', 'Senior Product Designer', 'SBOS Gold Premier PPO', 'Enrolled', 0, 480),
  ('ae000000-0000-0000-0000-000000000003', 'ad000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Elena Rostova', 'Director of Marketing', 'SBOS Silver HDHP + HSA', 'Enrolled', 1, 510),
  ('ae000000-0000-0000-0000-000000000004', 'ad000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'David Kim', 'DevOps Engineer', 'Pending Enrollment', 'Action Required', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- White-label settings for the seeded organizations (tenant-management console).
UPDATE public.organizations SET
  subdomain = 'bayarea.sbos.health', custom_domain = 'portal.bayareahealth.org',
  plan_tier = 'Health System Custom', monthly_rate = 68000, active_enrollees = 18500,
  renewal_date = '2027-01-01', billing_status = 'active', users_count = 640,
  branding = '{"portalTitle":"Bay Area Health Portal","tagline":"Compassionate regional care","supportEmail":"support@bayareahealth.org","supportPhone":"+1 (800) 555-0123","brandThemeColor":"blue"}'::jsonb
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.organizations SET
  subdomain = 'sbospremier.sbos.health', plan_tier = 'Payer Suite', monthly_rate = 95000,
  active_enrollees = 42000, renewal_date = '2026-11-01', billing_status = 'active', users_count = 210,
  branding = '{"portalTitle":"SBOS Gold Premier","tagline":"Smarter coverage","supportEmail":"members@sbospremier.com","supportPhone":"+1 (800) 555-0177","brandThemeColor":"indigo"}'::jsonb
WHERE id = '22222222-2222-2222-2222-222222222222';

UPDATE public.organizations SET
  subdomain = 'acme.sbos.health', plan_tier = 'Enterprise SaaS', monthly_rate = 35000,
  active_enrollees = 142, renewal_date = '2027-01-01', billing_status = 'active', users_count = 150,
  branding = '{"portalTitle":"Acme Benefits","tagline":"Team health, simplified","supportEmail":"hr@acme.test","supportPhone":"+1 (800) 555-0199","brandThemeColor":"teal"}'::jsonb
WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO public.claims (id, claim_number, patient_id, provider_id, payer_organization_id, organization_id, patient_name, provider_name, provider_npi, service_date, total_billed, approved_amount, patient_copay, status, icd10_codes, cpt_codes, ai_risk_score, ai_risk_flags, plain_english_explanation)
VALUES ('f0000000-0000-0000-0000-000000000001', 'CLM-2026-884102', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sarah Jenkins', 'Dr. James Wilson', '1982736410', '2026-07-10', 1250.00, 1100.00, 30.00, 'paid',
        '["R07.9","I10"]'::jsonb, '["71250","99214"]'::jsonb, 4, '[]'::jsonb,
        'Chest CT scan and routine outpatient consultation. Covered at 90% in-network tier. You owe a flat $30 copay.')
ON CONFLICT (id) DO NOTHING;

-- A second claim (in review) so the payer/provider views show multiple rows.
INSERT INTO public.claims (id, claim_number, patient_id, provider_id, payer_organization_id, organization_id, patient_name, provider_name, provider_npi, service_date, total_billed, approved_amount, patient_copay, status, icd10_codes, cpt_codes, ai_risk_score, ai_risk_flags, plain_english_explanation)
VALUES ('f0000000-0000-0000-0000-000000000002', 'CLM-2026-992144', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Sarah Jenkins', 'Dr. James Wilson', '1982736410', '2026-07-18', 840.00, 0.00, 40.00, 'in_review',
        '["M25.561"]'::jsonb, '["99203","73560"]'::jsonb, 12, '["Minor code combination query"]'::jsonb,
        'Knee evaluation and X-Ray. Currently undergoing automated adjudication. Estimated copay $40.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (organization_id, actor_id, action, resource_type, resource_id, ip_address)
VALUES ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'EHR_RECORD_VIEW', 'Patient', 'c0000000-0000-0000-0000-000000000001', '10.0.4.19');
