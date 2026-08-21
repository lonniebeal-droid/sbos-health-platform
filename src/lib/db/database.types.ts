// Database models — hand-written to match the canonical schema in
// supabase/migrations/20260724000000_enterprise_schema.sql and the auth/RLS
// migration. Once the local stack is running these can be regenerated and
// cross-checked with:  supabase gen types typescript --local
//
// Naming is snake_case to mirror Postgres exactly. Map to the camelCase UI
// domain types (src/types.ts) via src/lib/db/mappers.ts.

// ----- Enums (mirror CREATE TYPE ... AS ENUM) -----
export type DbUserRole = 'patient' | 'provider' | 'insurance' | 'employer' | 'admin';
// Claims live on the normalized schema of the "SBOS HealthOS" Supabase project
// (ref yqlvcmydledbkudstqfo), applied there via migrations named
// claims_foundation / claims_payments_foundation that are not present in this
// repo's supabase/migrations/ history. This enum mirrors the live CHECK
// constraint on public.claims.status exactly (confirmed via introspection).
export type DbClaimStatus = 'draft' | 'ready' | 'submitted' | 'in_review' | 'paid' | 'denied' | 'void';
export type DbAppointmentType = 'telehealth' | 'in_person' | 'urgent_care' | 'specialist';
export type DbAppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type DbRxStatus = 'active' | 'refill_requested' | 'expired' | 'discontinued';
export type DbPriorAuthStatus = 'pending' | 'approved' | 'denied' | 'info_requested';
export type DbOrgType = 'health_system' | 'payer' | 'employer_group' | 'clinic';

// ----- Row types (SELECT result shape) -----
export interface OrganizationRow {
  id: string;
  name: string;
  type: DbOrgType;
  tax_id: string | null;
  npi: string | null;
  created_at: string;
  updated_at: string;
}

// `public.users` is a PROFILE table keyed to auth.users(id). Passwords live in
// Supabase Auth (auth.users), never here.
export interface UserRow {
  id: string;
  organization_id: string | null;
  email: string;
  role: DbUserRole;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PatientRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  dob: string;
  gender: string | null;
  address: string | null;
  insurance_member_id: string;
  policy_group_number: string;
  blood_type: string | null;
  allergies: string[];
  chronic_conditions: string[];
  recent_vitals: PatientVitals | null;
  family_members: PatientFamilyMember[];
  primary_care_physician: string | null;
  created_at: string;
}

export interface PatientVitals {
  bloodPressure: string;
  heartRate: number;
  spO2: number;
  weightLbs: number;
  date: string;
}

export interface PatientFamilyMember {
  id: string;
  name: string;
  relation: string;
  dob: string;
}

/** A patient row with its linked user profile (name/email/phone). */
export interface PatientWithUser extends PatientRow {
  user: { full_name: string; email: string; phone: string | null } | null;
}

/** A prescription with the prescribing provider's name (via provider->user). */
export interface PrescriptionWithProvider extends PrescriptionRow {
  provider: { user: { full_name: string } | null } | null;
}

/** An appointment with patient + provider display names. */
export interface AppointmentWithNames extends AppointmentRow {
  patient: { user: { full_name: string } | null } | null;
  provider: { specialty: string; user: { full_name: string } | null } | null;
}

export interface ProviderRow {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  npi: string;
  specialty: string;
  license_number: string;
  accepting_new_patients: boolean;
  consultation_fee: number;
  created_at: string;
}

/** A provider row with its linked user profile for display identity. */
export interface ProviderWithUser extends ProviderRow {
  user: { full_name: string; phone: string | null } | null;
}

export interface AppointmentRow {
  id: string;
  patient_id: string | null;
  provider_id: string | null;
  organization_id: string | null;
  appointment_type: DbAppointmentType;
  status: DbAppointmentStatus;
  scheduled_at: string;
  telehealth_room_url: string | null;
  chief_complaint: string | null;
  created_at: string;
}

// ----- Claims domain (normalized — matches the live "SBOS HealthOS" schema) -----
//
// The claims table itself carries only the charge total and workflow
// timestamps; money and outcome detail live in dedicated child tables. There
// is no `providers` table and no NPI column anywhere in the live schema yet —
// the rendering provider is `encounters.provider_user_id -> users`, and NPI
// is simply not captured. Mappers must not invent an NPI value.
export type DbPaymentSource = 'payer' | 'patient' | 'other';
export type DbAdjustmentType = 'contractual' | 'write_off' | 'correction' | 'refund' | 'other';
export type DbClaimLineStatus = 'pending' | 'approved' | 'denied';

export interface ClaimRow {
  id: string;
  organization_id: string;
  patient_id: string;
  encounter_id: string;
  insurance_info_id: string;
  claim_number: string;
  status: DbClaimStatus;
  total_charge_cents: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimLineRow {
  id: string;
  organization_id: string;
  claim_id: string;
  encounter_procedure_id: string | null;
  procedure_code: string;
  procedure_description: string;
  units: number;
  charge_cents: number;
  line_total_cents: number;
  status: DbClaimLineStatus;
  denial_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimStatusEventRow {
  id: string;
  organization_id: string;
  claim_id: string;
  from_status: DbClaimStatus | null;
  to_status: DbClaimStatus;
  reason: string | null;
  changed_by_user_id: string | null;
  created_at: string;
}

export interface ClaimPaymentRow {
  id: string;
  organization_id: string;
  claim_id: string;
  claim_line_id: string | null;
  payment_source: DbPaymentSource;
  payment_method: string;
  amount_cents: number;
  reference_number: string | null;
  paid_at: string;
  posted_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimAdjustmentRow {
  id: string;
  organization_id: string;
  claim_id: string;
  claim_line_id: string | null;
  adjustment_type: DbAdjustmentType;
  amount_cents: number;
  reason: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/** A denial reason record. `claim_line_id = null` means a claim-level denial; set means line-level. */
export interface ClaimDenialRow {
  id: string;
  organization_id: string;
  claim_id: string;
  claim_line_id: string | null;
  denial_code: string | null;
  denial_reason: string;
  denied_at: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/** A claim joined with everything the UI needs to compute names, codes, and balances. */
export interface ClaimWithDetails extends ClaimRow {
  patient: { full_name: string } | null;
  encounter: {
    encounter_date: string;
    provider: { full_name: string } | null;
    encounter_diagnoses: { diagnosis: { code: string } | null }[];
  } | null;
  claim_lines: ClaimLineRow[];
  claim_payments: ClaimPaymentRow[];
  claim_adjustments: ClaimAdjustmentRow[];
  claim_denials: ClaimDenialRow[];
  claim_status_events: ClaimStatusEventRow[];
}

/** A prior authorization with patient + provider display names. */
export interface PriorAuthorizationWithNames extends PriorAuthorizationRow {
  patient: { user: { full_name: string } | null } | null;
  provider: { user: { full_name: string } | null } | null;
}

export interface PrescriptionRow {
  id: string;
  patient_id: string | null;
  provider_id: string | null;
  organization_id: string | null;
  medication_name: string;
  dosage: string;
  frequency: string;
  refills_remaining: number;
  status: DbRxStatus;
  pharmacy_name: string | null;
  created_at: string;
}

export interface PriorAuthorizationRow {
  id: string;
  patient_id: string | null;
  provider_id: string | null;
  organization_id: string | null;
  requested_service: string;
  icd10_code: string;
  cpt_code: string;
  status: DbPriorAuthStatus;
  clinical_notes: string | null;
  ai_recommendation: string | null;
  created_at: string;
}

export interface LabResultRow {
  id: string;
  patient_id: string | null;
  ordering_provider_id: string | null;
  organization_id: string | null;
  loinc_code: string;
  test_name: string;
  result_value: string;
  reference_range: string | null;
  status: string;
  result_date: string;
}

export type DbMedicalRecordType = 'Lab Result' | 'Immunization' | 'Visit Summary' | 'Imaging';
export type DbMedicalRecordStatus = 'normal' | 'abnormal' | 'pending';

export interface MedicalRecordRow {
  id: string;
  patient_id: string | null;
  organization_id: string | null;
  record_date: string;
  type: DbMedicalRecordType;
  title: string;
  doctor: string | null;
  facility: string | null;
  summary: string | null;
  status: DbMedicalRecordStatus;
  file_url: string | null;
  created_at: string;
}

export interface BenefitsPlanRow {
  id: string;
  patient_id: string | null;
  organization_id: string | null;
  plan_id: string;
  plan_name: string;
  network_type: 'PPO' | 'HMO' | 'EPO';
  individual_deductible: number;
  deductible_met: number;
  out_of_pocket_max: number;
  out_of_pocket_met: number;
  copays: {
    primaryCare: number;
    specialist: number;
    urgentCare: number;
    emergencyRoom: number;
    genericRx: number;
  };
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

// Insert payloads: id/created_at/defaults are DB-generated, so omit them.
export type OrganizationInsert = Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'>;
export type AppointmentInsert = Omit<AppointmentRow, 'id' | 'created_at'>;
export type PriorAuthorizationInsert = Omit<PriorAuthorizationRow, 'id' | 'created_at'>;
export type AuditLogInsert = Omit<AuditLogRow, 'id' | 'timestamp'>;

/** Table-name → row-type registry (handy for generic helpers/tests). */
export interface Database {
  organizations: OrganizationRow;
  users: UserRow;
  patients: PatientRow;
  providers: ProviderRow;
  appointments: AppointmentRow;
  claims: ClaimRow;
  claim_lines: ClaimLineRow;
  claim_status_events: ClaimStatusEventRow;
  claim_payments: ClaimPaymentRow;
  claim_adjustments: ClaimAdjustmentRow;
  claim_denials: ClaimDenialRow;
  prescriptions: PrescriptionRow;
  prior_authorizations: PriorAuthorizationRow;
  lab_results: LabResultRow;
  medical_records: MedicalRecordRow;
  benefits_plans: BenefitsPlanRow;
  audit_logs: AuditLogRow;
}

export type TableName = keyof Database;
