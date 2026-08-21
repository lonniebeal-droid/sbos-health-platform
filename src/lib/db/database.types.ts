// Database models — hand-written to match the canonical schema in
// supabase/migrations/20260724000000_enterprise_schema.sql and the auth/RLS
// migration. Once the local stack is running these can be regenerated and
// cross-checked with:  supabase gen types typescript --local
//
// Naming is snake_case to mirror Postgres exactly. Map to the camelCase UI
// domain types (src/types.ts) via src/lib/db/mappers.ts.

// ----- Enums (mirror CREATE TYPE ... AS ENUM) -----
//
// The live "SBOS HealthOS" project's public.users.role CHECK constraint only
// allows: admin | provider | medical_biller | coder | front_desk | staff | patient
// (confirmed via introspection). It predates this app's payer/employer-facing
// UI and has no role for either — 'insurance' and 'employer' below are a
// PROPOSED addition to that constraint (see
// supabase/migrations/20260821000000_add_payer_employer_roles.sql, NOT applied
// to the live project). Until that migration runs, no live user can actually
// hold either value; see src/lib/roleMapping.ts for how live roles are mapped
// onto the UI's Role type in the meantime.
export type DbUserRole =
  | 'patient' | 'provider' | 'medical_biller' | 'coder' | 'front_desk' | 'staff' | 'admin'
  | 'insurance' | 'employer';
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
// Live organizations has no classification/identifier columns yet (confirmed
// via introspection: id, name, slug, created_at, updated_at only). These are
// cosmetic (admin branding display, not access control — see
// TenantManagement.tsx), so no schema change is proposed for them; mappers
// degrade to a neutral 'Organization' badge and '—' identifier instead.
export type DbOrgType = 'health_system' | 'payer' | 'employer_group' | 'clinic';

// ----- Row types (SELECT result shape) -----
export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  /** Not a live column yet — always undefined until a schema decision is made (see DbOrgType comment). */
  type?: DbOrgType;
  tax_id?: string | null;
  npi?: string | null;
  created_at: string;
  updated_at: string;
}

// `public.users` is a PROFILE table keyed to auth.users(id). Passwords live in
// Supabase Auth (auth.users), never here. Live schema has no `phone` column on
// users (patients carry their own phone directly — see PatientRow).
export interface UserRow {
  id: string;
  organization_id: string | null;
  email: string;
  role: DbUserRole;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Live `patients` (confirmed via introspection) carries demographics directly
// — no join to `users` is needed for name/email/phone. Insurance identifiers
// (member ID, group number) live on the separate `insurance_info` table, not
// on patients. Clinical/EHR fields the old flat schema had (blood type,
// allergies, chronic conditions, vitals, family members, PCP) have no live
// table at all yet; mapPatient() defaults them to honest empty states rather
// than proposing new clinical schema outside this task's scope.
export interface PatientRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export type DbInsuranceStatus = 'active' | 'inactive' | 'pending' | 'expired';

/** Per-service-type copay amounts, in cents. All keys optional — populate as known. */
export interface BenefitsCopaysCents {
  primaryCare?: number;
  specialist?: number;
  urgentCare?: number;
  emergencyRoom?: number;
  genericRx?: number;
}

/**
 * A patient's insurance/coverage record — member ID/group number live here,
 * and (as of the benefits-tracking migration) so do deductible/OOP/copay
 * figures. There is no separate `benefits_plans` table — those figures are
 * 1:1 attributes of one coverage record, not a distinct list. Internal
 * benefits tracking only: no real-time payer eligibility/benefit-check API
 * integration exists anywhere in this app.
 */
export interface InsuranceInfoRow {
  id: string;
  organization_id: string;
  patient_id: string;
  payer_name: string;
  plan_name: string | null;
  member_id: string;
  group_number: string | null;
  policy_holder_name: string | null;
  relationship_to_patient: 'self' | 'spouse' | 'child' | 'other';
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  status: DbInsuranceStatus;
  network_type: 'PPO' | 'HMO' | 'EPO' | null;
  individual_deductible_cents: number | null;
  deductible_met_cents: number | null;
  out_of_pocket_max_cents: number | null;
  out_of_pocket_met_cents: number | null;
  copays: BenefitsCopaysCents | null;
  created_at: string;
  updated_at: string;
}

/** A patient row with its (possibly absent) insurance/coverage record. */
export interface PatientWithDetails extends PatientRow {
  insurance: InsuranceInfoRow | null;
}

/** A prescription with the prescribing provider's name. No providers table
 * live — provider_id points straight at users.id (role = 'provider'). */
export interface PrescriptionWithProvider extends PrescriptionRow {
  provider: { full_name: string } | null;
}

/** An appointment with patient + provider display names. Proposed schema — see AppointmentRow. */
export interface AppointmentWithNames extends AppointmentRow {
  patient: { full_name: string } | null;
  provider: { full_name: string } | null;
}

// There is no `providers` table in the live schema — a provider is simply a
// row in `users` with role = 'provider' (encounters.provider_user_id already
// points straight at users.id). None of NPI/specialty/license/fees/
// accepting-new-patients exist anywhere live; mapProvider() defaults them
// honestly rather than fabricating clinical directory data. Do not add a
// `providers` table for this — it isn't needed.
export interface ProviderIdentityRow {
  id: string;
  organization_id: string | null;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

// PROPOSED schema — the live project has no `appointments` table at all
// (confirmed via introspection: organizations/users/patients/insurance_info/
// encounters/diagnosis_codes/procedure_codes/encounter_*/claims* only). This
// shape is the smallest viable scheduling table: it mirrors the pre-existing
// local shape but points provider_id at `users.id` (no providers table) and
// drops nothing else. See
// supabase/migrations/20260821000100_add_appointments_table.sql — written but
// NOT applied. Until it is, `.from('appointments')` calls fail against the
// live project and the app's existing try/catch + demo-fallback paths handle
// that the same way they already handle any other unavailable live table.
export interface AppointmentRow {
  id: string;
  organization_id: string;
  patient_id: string;
  provider_id: string;
  appointment_type: DbAppointmentType;
  status: DbAppointmentStatus;
  scheduled_at: string;
  telehealth_room_url: string | null;
  chief_complaint: string | null;
  created_at: string;
  updated_at: string;
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

/**
 * A prior authorization with patient (+ its insurance record, when one
 * exists) and provider display names. There is no external payer submission
 * integration anywhere in this app — this table is INTERNAL TRACKING ONLY,
 * not a real EDI 278 transaction or payer API call.
 */
export interface PriorAuthorizationWithNames extends PriorAuthorizationRow {
  patient: { full_name: string; insurance: InsuranceInfoRow | null } | null;
  provider: { full_name: string } | null;
}

export interface PrescriptionRow {
  id: string;
  organization_id: string;
  patient_id: string;
  provider_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  refills_remaining: number;
  status: DbRxStatus;
  pharmacy_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriorAuthorizationRow {
  id: string;
  organization_id: string;
  patient_id: string;
  provider_id: string;
  requested_service: string;
  icd10_code: string;
  cpt_code: string;
  status: DbPriorAuthStatus;
  clinical_notes: string | null;
  ai_recommendation: string | null;
  created_at: string;
  updated_at: string;
}

// Internal lab result tracking only — there is no external lab vendor (e.g.
// Quest/Labcorp) or HL7/FHIR ingestion integration anywhere in this app.
// `status` stays unconstrained text (matches the live CHECK-free column).
export interface LabResultRow {
  id: string;
  organization_id: string;
  patient_id: string;
  ordering_provider_id: string | null;
  loinc_code: string;
  test_name: string;
  result_value: string;
  reference_range: string | null;
  status: string;
  result_date: string;
  created_at: string;
  updated_at: string;
}

export type DbMedicalRecordType = 'Lab Result' | 'Immunization' | 'Visit Summary' | 'Imaging';
export type DbMedicalRecordStatus = 'normal' | 'abnormal' | 'pending';

// Internal medical record tracking only — no external EHR exchange, HIE, or
// FHIR ingestion integration anywhere in this app. `doctor` is free text
// (no author FK exists on the live table), matching the applied migration.
export interface MedicalRecordRow {
  id: string;
  organization_id: string;
  patient_id: string;
  record_date: string;
  type: DbMedicalRecordType;
  title: string;
  doctor: string | null;
  facility: string | null;
  summary: string | null;
  status: DbMedicalRecordStatus;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

// Internal application audit logging only — this is not a certified
// compliance program, SOC2 evidence, or an immutable/tamper-proof log; it's
// a plain Postgres table an app process writes to. organization_id/actor_id
// are nullable to allow system-generated events with no acting user.
export interface AuditLogRow {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

// Insert payloads: id/created_at/defaults are DB-generated, so omit them.
export type OrganizationInsert = Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'>;
export type AppointmentInsert = Omit<AppointmentRow, 'id' | 'created_at' | 'updated_at'>;
export type PriorAuthorizationInsert = Omit<PriorAuthorizationRow, 'id' | 'created_at' | 'updated_at'>;
export type AuditLogInsert = Omit<AuditLogRow, 'id' | 'created_at'>;

/** Table-name → row-type registry (handy for generic helpers/tests). `providers` is
 * intentionally absent — there is no live providers table (see ProviderIdentityRow). */
export interface Database {
  organizations: OrganizationRow;
  users: UserRow;
  patients: PatientRow;
  insurance_info: InsuranceInfoRow;
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
  audit_logs: AuditLogRow;
}

export type TableName = keyof Database;
