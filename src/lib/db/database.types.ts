// Database models — hand-written to match the canonical schema in
// supabase/migrations/20260724000000_enterprise_schema.sql and the auth/RLS
// migration. Once the local stack is running these can be regenerated and
// cross-checked with:  supabase gen types typescript --local
//
// Naming is snake_case to mirror Postgres exactly. Map to the camelCase UI
// domain types (src/types.ts) via src/lib/db/mappers.ts.

// ----- Enums (mirror CREATE TYPE ... AS ENUM) -----
export type DbUserRole = 'patient' | 'provider' | 'insurance' | 'employer' | 'admin';
export type DbClaimStatus =
  | 'submitted' | 'in_review' | 'adjudicated' | 'approved' | 'denied' | 'paid';
export type DbAppointmentType = 'telehealth' | 'in_person' | 'urgent_care' | 'specialist';
export type DbAppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type DbRxStatus = 'active' | 'refill_requested' | 'expired' | 'discontinued';
export type DbPriorAuthStatus = 'pending' | 'approved' | 'denied' | 'info_requested';
export type DbOrgType = 'health_system' | 'payer' | 'employer_group' | 'clinic';

// ----- Row types (SELECT result shape) -----
export interface OrgPermissions {
  telehealthEnabled: boolean;
  rcmEdiEnabled: boolean;
  priorAuthAiEnabled: boolean;
  behavioralHealthEnabled: boolean;
  employerPortalEnabled: boolean;
  mfaEnforced: boolean;
}

export interface OrgBranding {
  portalTitle?: string;
  tagline?: string;
  supportEmail?: string;
  supportPhone?: string;
  brandThemeColor?: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  type: DbOrgType;
  tax_id: string | null;
  npi: string | null;
  subdomain: string | null;
  custom_domain: string | null;
  primary_color: string | null;
  accent_color: string | null;
  plan_tier: string | null;
  monthly_rate: number;
  active_enrollees: number;
  renewal_date: string | null;
  billing_status: string;
  users_count: number;
  permissions: OrgPermissions;
  branding: OrgBranding;
  created_at: string;
  updated_at: string;
}

/** Fields a tenant admin may update on their own organization. */
export type OrganizationUpdate = Partial<
  Pick<OrganizationRow,
    'name' | 'subdomain' | 'custom_domain' | 'primary_color' | 'accent_color' |
    'plan_tier' | 'monthly_rate' | 'active_enrollees' | 'renewal_date' |
    'billing_status' | 'permissions' | 'branding'>
>;

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
  full_name: string | null;
  rating: number;
  review_count: number;
  in_network: boolean;
  hospital_affiliation: string | null;
  address: string | null;
  phone: string | null;
  next_available_slot: string | null;
  avatar_url: string | null;
  bio: string | null;
  education: string | null;
  created_at: string;
}

/** A provider row with its linked user profile (name fallback). */
export interface ProviderWithUser extends ProviderRow {
  user: { full_name: string } | null;
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

export interface ClaimRow {
  id: string;
  claim_number: string;
  patient_id: string | null;
  provider_id: string | null;
  payer_organization_id: string | null;
  organization_id: string | null;
  service_date: string;
  total_billed: number;
  approved_amount: number;
  patient_copay: number;
  status: DbClaimStatus;
  icd10_codes: string[];
  cpt_codes: string[];
  ai_risk_score: number;
  ai_risk_flags: string[];
  plain_english_explanation: string | null;
  // Denormalized display identity (see 20260725020000_claims_visibility.sql).
  patient_name: string | null;
  provider_name: string | null;
  provider_npi: string | null;
  // Lifecycle: payment posting + denial (see 20260725080000_claims_lifecycle.sql).
  paid_amount: number;
  paid_at: string | null;
  denial_reason: string | null;
  created_at: string;
}

/** A claim with patient + provider display names and provider NPI. */
export interface ClaimWithNames extends ClaimRow {
  patient: { user: { full_name: string } | null } | null;
  provider: { npi: string; user: { full_name: string } | null } | null;
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

/** An audit log row with the actor's display name (via actor_id -> users). */
export interface AuditLogWithActor extends AuditLogRow {
  actor: { full_name: string } | null;
}

export interface EmployerGroupRow {
  id: string;
  organization_id: string | null;
  company_name: string;
  group_number: string | null;
  active_enrollees: number;
  plan_type: string | null;
  monthly_premium_total: number;
  renewal_date: string | null;
  wellness_participation_rate: number;
  status: 'active' | 'pending_renewal';
  created_at: string;
}

export interface EmployerMemberRow {
  id: string;
  employer_group_id: string | null;
  organization_id: string | null;
  full_name: string;
  job_role: string | null;
  plan: string | null;
  status: string;
  dependents: number;
  premium_monthly: number;
  created_at: string;
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
  prescriptions: PrescriptionRow;
  prior_authorizations: PriorAuthorizationRow;
  lab_results: LabResultRow;
  medical_records: MedicalRecordRow;
  benefits_plans: BenefitsPlanRow;
  employer_groups: EmployerGroupRow;
  employer_members: EmployerMemberRow;
  audit_logs: AuditLogRow;
}

export type TableName = keyof Database;
