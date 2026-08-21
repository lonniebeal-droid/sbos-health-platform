-- ====================================================================
-- SBOS HealthOS — LOCAL DEV SEED (applied by `supabase db reset` / first `supabase start`)
--
-- ⚠️ LOCAL TEST DATA ONLY. Fake credentials — never use in shared/production.
-- All test users share the password:  Password123!
--
--   provider@bayarea.test   provider   Bay Area Health System
--   patient@bayarea.test    patient    Bay Area Health System
--   payer@sbospremier.test  insurance  SBOS Gold Premier Insurance
--   admin@bayarea.test      admin      Bay Area Health System
--
-- Matches the live "SBOS HealthOS" project's actual normalized schema
-- (organizations/users/patients/insurance_info/encounters/diagnosis_codes/
-- procedure_codes/claims+children/appointments/prior_authorizations/
-- prescriptions/lab_results/medical_records/audit_logs) — there is no
-- `providers` table (a provider is just a `users` row with role='provider')
-- and claims are built from an encounter + coded procedures, not flat JSON
-- code arrays. Organizations have 0 rows on the live project too — they
-- were only ever created by an old, now-removed migration that this repo's
-- schema was never actually built from, so this seed file creates them for
-- local dev.
-- ====================================================================

INSERT INTO public.organizations (id, name, slug)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Bay Area Health System', 'bay-area-health-system'),
  ('22222222-2222-2222-2222-222222222222', 'SBOS Gold Premier Insurance', 'sbos-gold-premier-insurance'),
  ('33333333-3333-3333-3333-333333333333', 'Acme Technology Corp', 'acme-technology-corp')
ON CONFLICT (id) DO NOTHING;

-- Supabase Auth users. The trigger (handle_new_user, see
-- 20260821174350_secure_profile_provisioning_and_rls.sql) creates an
-- unassigned patient profile for each. The trusted seed upsert below then
-- assigns fixture roles and organizations explicitly — user-supplied signup
-- metadata is never an authorization source, matching how a real trusted
-- admin path would work.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) VALUES
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000001','authenticated','authenticated','provider@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Dr. James Wilson'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000002','authenticated','authenticated','patient@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Sarah Jenkins'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000003','authenticated','authenticated','payer@sbospremier.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Elena Rostova'),now(),now(),'','','',''),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000004','authenticated','authenticated','admin@bayarea.test',crypt('Password123!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}',jsonb_build_object('full_name','Devon Sterling'),now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

-- Only trusted database administration assigns access-bearing fields.
INSERT INTO public.users (id, email, full_name, role, organization_id, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'provider@bayarea.test', 'Dr. James Wilson', 'provider', '11111111-1111-1111-1111-111111111111', true),
  ('a0000000-0000-0000-0000-000000000002', 'patient@bayarea.test', 'Sarah Jenkins', 'patient', '11111111-1111-1111-1111-111111111111', true),
  ('a0000000-0000-0000-0000-000000000003', 'payer@sbospremier.test', 'Elena Rostova', 'insurance', '22222222-2222-2222-2222-222222222222', true),
  ('a0000000-0000-0000-0000-000000000004', 'admin@bayarea.test', 'Devon Sterling', 'admin', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    organization_id = EXCLUDED.organization_id,
    is_active = EXCLUDED.is_active;

-- Email identities (required by GoTrue for password sign-in).
INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000001','email','provider@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000002',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000002','email','patient@bayarea.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000003',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000003','email','payer@sbospremier.test'),'email',now(),now(),now()),
  ('a0000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000004',jsonb_build_object('sub','a0000000-0000-0000-0000-000000000004','email','admin@bayarea.test'),'email',now(),now(),now())
ON CONFLICT DO NOTHING;

-- Patient demographics. There is no separate `providers` table live — a
-- provider is simply a `users` row with role = 'provider'
-- (a0000000-...-0001 above), referenced directly by provider_id/
-- provider_user_id columns below.
INSERT INTO public.patients (id, organization_id, user_id, full_name, date_of_birth, gender, email, phone, address)
VALUES ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000002',
        'Sarah Jenkins', '1988-04-12', 'Female', 'patient@bayarea.test', '415-555-0182',
        '742 Evergreen Terrace, San Francisco, CA 94107')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.insurance_info (id, organization_id, patient_id, payer_name, plan_name, member_id, group_number, policy_holder_name, relationship_to_patient, coverage_start_date, status, network_type, individual_deductible_cents, deductible_met_cents, out_of_pocket_max_cents, out_of_pocket_met_cents, copays)
VALUES ('ac000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001',
        'SBOS Gold Premier Insurance', 'Gold Premier PPO Health Plan', 'SBOS-98421092', 'SBOS-GOLD-PPO-2026', 'Sarah Jenkins', 'self',
        '2026-01-01', 'active', 'PPO', 150000, 125000, 450000, 168000,
        '{"primaryCare":20,"specialist":45,"urgentCare":50,"emergencyRoom":250,"genericRx":10}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, organization_id, patient_id, provider_id, appointment_type, status, scheduled_at, telehealth_room_url, chief_complaint)
VALUES ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'telehealth', 'scheduled', '2026-07-28T10:00:00Z',
        'https://sbos.health/meet/room-v721', 'Annual wellness check & bloodwork review')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prescriptions (id, organization_id, patient_id, provider_id, medication_name, dosage, frequency, refills_remaining, status, pharmacy_name)
VALUES ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        'Lisinopril', '10 mg Tablet', 'Take 1 tablet daily by mouth', 3, 'active',
        'Walgreens Pharmacy - #1402 Castro St')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.prior_authorizations (id, organization_id, patient_id, provider_id, requested_service, icd10_code, cpt_code, status, clinical_notes, ai_recommendation)
VALUES
  ('aa000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Cardiac MRI with Contrast', 'I25.10', '75561', 'approved',
   'Persistent atypical angina despite medication; prior echo showed minor ejection fraction variance.',
   'Approve: documentation meets InterQual criteria for chest pain evaluation with inconclusive EKG.'),
  ('aa000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Intensive Outpatient Therapy (IOP)', 'F41.1', '90837', 'pending',
   'Weekly CBT showed moderate gains; step-up intensive care requested to avoid hospital admission.',
   'Recommend approval: GAD refractory to 12 weeks standard weekly therapy.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.medical_records (id, organization_id, patient_id, record_date, type, title, doctor, facility, summary, status)
VALUES
  ('ab000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001',
   '2026-07-15', 'Lab Result', 'Comprehensive Metabolic Panel & Lipid Profile', 'Dr. James Wilson, MD', 'SBOS Diagnostic Labs',
   'Total Cholesterol: 185 mg/dL (Normal). Fasting Glucose: 92 mg/dL (Normal). Electrolytes within optimal ranges.', 'normal'),
  ('ab000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001',
   '2026-06-10', 'Immunization', 'Tdap Booster & Annual Influenza Vaccine', 'Dr. James Wilson, MD', 'Primary Care Network Clinic',
   'Administered in left deltoid. No adverse reaction observed during 15-min post-vaccine monitoring window.', 'normal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lab_results (id, organization_id, patient_id, ordering_provider_id, loinc_code, test_name, result_value, reference_range, status, result_date)
VALUES ('ad000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        '2093-3', 'Total Cholesterol', '185 mg/dL', '< 200 mg/dL', 'final', '2026-07-15')
ON CONFLICT (id) DO NOTHING;

-- Coding reference data + a minimal real encounter/claim chain. Claims are
-- built from a coded encounter (not flat JSON code arrays) on the live
-- schema, so a usable claims fixture needs the full chain: diagnosis code +
-- procedure code -> encounter -> encounter_diagnoses/encounter_procedures ->
-- claim -> claim_lines.
INSERT INTO public.diagnosis_codes (id, organization_id, code, description, code_system)
VALUES ('ae000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'R07.9', 'Chest pain, unspecified', 'ICD-10')
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO public.procedure_codes (id, organization_id, code, description, code_system, default_charge_cents)
VALUES ('af000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '71250', 'CT chest without contrast', 'CPT', 125000)
ON CONFLICT (organization_id, code) DO NOTHING;

INSERT INTO public.encounters (id, organization_id, patient_id, provider_user_id, encounter_date, encounter_type, status, chief_complaint, notes_summary)
VALUES ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
        '2026-07-10', 'office_visit', 'signed', 'Chest pain evaluation',
        'Chest CT scan and routine outpatient consultation. No acute findings.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.encounter_diagnoses (id, organization_id, encounter_id, diagnosis_code_id, sort_order)
VALUES ('b1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001', 'ae000000-0000-0000-0000-000000000001', 0)
ON CONFLICT (encounter_id, diagnosis_code_id) DO NOTHING;

INSERT INTO public.encounter_procedures (id, organization_id, encounter_id, procedure_code_id, units, charge_cents)
VALUES ('b2000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001', 'af000000-0000-0000-0000-000000000001', 1, 125000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claims (id, organization_id, patient_id, encounter_id, insurance_info_id, claim_number, status, total_charge_cents, submitted_at, reviewed_at, paid_at, created_by_user_id)
VALUES ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ac000000-0000-0000-0000-000000000001',
        'CLM-2026-884102', 'paid', 125000, '2026-07-11T00:00:00Z', '2026-07-12T00:00:00Z', '2026-07-14T00:00:00Z', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (organization_id, claim_number) DO NOTHING;

INSERT INTO public.claim_lines (id, organization_id, claim_id, encounter_procedure_id, procedure_code, procedure_description, units, charge_cents, line_total_cents, status)
VALUES ('f1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001',
        '71250', 'CT chest without contrast', 1, 125000, 125000, 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.claim_payments (id, organization_id, claim_id, claim_line_id, payment_source, payment_method, amount_cents, reference_number, paid_at, posted_by_user_id)
VALUES ('f2000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001',
        'payer', 'eft', 110000, 'EFT-2026-77201', '2026-07-14T00:00:00Z', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.audit_logs (organization_id, actor_id, action, resource_type, resource_id, ip_address)
VALUES ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'EHR_RECORD_VIEW', 'Patient', 'c0000000-0000-0000-0000-000000000001', '10.0.4.19');
