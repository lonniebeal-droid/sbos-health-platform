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
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated','admin@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Devon Sterling','role','admin','organization_id','11111111-1111-1111-1111-111111111111'),now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- Email identities (required by GoTrue for password sign-in).
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000001','email','provider@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000002','email','patient@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000003','email','payer@sbospremier.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000004','email','admin@bayarea.test'),'email',now(),now(),now())
ON CONFLICT DO NOTHING;

-- Domain rows (profiles were auto-created by the trigger above).
INSERT INTO public.providers (id, user_id, organization_id, npi, specialty, license_number, accepting_new_patients, consultation_fee)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
        '1982736410', 'Internal Medicine & Primary Care', 'CA-MD-88213', true, 175.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, user_id, organization_id, dob, gender, address, insurance_member_id, policy_group_number, blood_type, allergies, chronic_conditions)
VALUES ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
        '1988-04-12', 'Female', '742 Evergreen Terrace, San Francisco, CA 94107', 'SBOS-98421092', 'SBOS-GOLD-PPO-2026', 'A+',
        '["Penicillin","Peanuts","Latex"]'::jsonb, '["Mild Asthma","Essential Hypertension"]'::jsonb)
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

INSERT INTO public.claims (id, claim_number, patient_id, provider_id, payer_organization_id, service_date, total_billed, approved_amount, patient_copay, status, icd10_codes, cpt_codes, ai_risk_score, ai_risk_flags)
VALUES ('f0000000-0000-0000-0000-000000000001', 'CLM-2026-884102', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
        '22222222-2222-2222-2222-222222222222', '2026-07-10', 1250.00, 1100.00, 30.00, 'paid',
        '["R07.9","I10"]'::jsonb, '["71250","99214"]'::jsonb, 4, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (organization_id, actor_id, action, resource_type, resource_id, ip_address)
VALUES ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'EHR_RECORD_VIEW', 'Patient', 'c0000000-0000-0000-0000-000000000001', '10.0.4.19');
