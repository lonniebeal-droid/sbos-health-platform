// Mappers: DB rows (snake_case) -> UI domain types (src/types.ts, camelCase).
//
// IMPORTANT: mappers only exist where the DB faithfully carries the data. The
// current schema is thinner than several UI domain types (e.g. Patient needs
// recentVitals / familyMembers / primaryCarePhysician, Provider needs rating /
// bio / avatar) which have no columns yet. Rather than fabricate those values,
// we do NOT provide lossy mappers for them — the repositories return raw rows,
// and the schema gaps are tracked in TECH_DEBT.md until columns/tables exist.

import type { TenantOrg } from '../organizationContext';
import type { AuditLog, Role, Patient, Prescription, Appointment, Claim, PriorAuth, MedicalRecord, BenefitsPlan, Provider } from '../../types';
import type { OrganizationRow, AuditLogRow, UserRow, DbOrgType, PatientWithDetails, PrescriptionWithProvider, DbRxStatus, AppointmentWithNames, ClaimWithDetails, PriorAuthorizationWithNames, MedicalRecordRow, BenefitsPlanRow, ProviderIdentityRow, LabResultRow } from './database.types';
import { sumPayments, calculatePatientResponsibilityCents, parseAdjudicationMethod, centsToDollars } from '../claimsBalance';

/** BenefitsPlanRow -> the UI BenefitsPlan domain type. */
export function mapBenefitsPlan(row: BenefitsPlanRow): BenefitsPlan {
  return {
    planId: row.plan_id,
    planName: row.plan_name,
    networkType: row.network_type,
    individualDeductible: row.individual_deductible,
    deductibleMet: row.deductible_met,
    outOfPocketMax: row.out_of_pocket_max,
    outOfPocketMet: row.out_of_pocket_met,
    copays: {
      primaryCare: row.copays?.primaryCare ?? 0,
      specialist: row.copays?.specialist ?? 0,
      urgentCare: row.copays?.urgentCare ?? 0,
      emergencyRoom: row.copays?.emergencyRoom ?? 0,
      genericRx: row.copays?.genericRx ?? 0,
    },
  };
}

/** MedicalRecordRow -> the UI MedicalRecord domain type. */
export function mapMedicalRecord(row: MedicalRecordRow): MedicalRecord {
  return {
    id: row.id,
    patientId: row.patient_id ?? '',
    date: row.record_date,
    type: row.type,
    title: row.title,
    doctor: row.doctor ?? '',
    facility: row.facility ?? '',
    summary: row.summary ?? '',
    status: row.status,
    fileUrl: row.file_url ?? undefined,
  };
}

export interface LabOrderDisplay {
  id: string;
  testName: string;
  loinc: string;
  facility: string;
  status: string;
  date: string;
  result: string;
  source: 'live' | 'demo';
}

/** LabResultRow -> the lab workflow display model. */
export function mapLabResult(row: LabResultRow): LabOrderDisplay {
  const referenceRange = row.reference_range ? ` Reference range: ${row.reference_range}` : '';
  return {
    id: row.id,
    testName: row.test_name,
    loinc: row.loinc_code,
    facility: 'Connected lab result',
    status: row.status,
    date: row.result_date,
    result: `${row.result_value}${referenceRange}`,
    source: 'live',
  };
}

/**
 * PriorAuthorizationWithNames -> the UI PriorAuth domain type. Live
 * `patients` carries name directly (no user join needed); the linked
 * insurance_info row (when one exists) supplies the payer name. This table
 * is INTERNAL TRACKING ONLY — there is no external payer submission
 * integration (no EDI 278 transaction, no payer API call) anywhere in this
 * app; `aiRecommendation` is a real LLM call's output, not a verified payer
 * or clinical-guideline decision.
 */
export function mapPriorAuth(row: PriorAuthorizationWithNames): PriorAuth {
  const providerName = row.provider?.full_name ?? undefined;
  const date = (row.created_at ?? '').slice(0, 10);
  return {
    id: row.id,
    authNumber: `PA-${row.id.slice(0, 8).toUpperCase()}`,
    patientId: row.patient_id,
    patientName: row.patient?.full_name ?? 'Unknown Patient',
    requestingProvider: providerName,
    providerName,
    requestedService: row.requested_service,
    serviceType: row.requested_service,
    icd10Code: row.icd10_code,
    icdCode: row.icd10_code,
    cptCode: row.cpt_code,
    status: row.status,
    requestedDate: date,
    submittedDate: date,
    clinicalNotes: row.clinical_notes ?? undefined,
    clinicalNotesSummary: row.clinical_notes ?? undefined,
    aiRecommendation: row.ai_recommendation ?? undefined,
    payerName: row.patient?.insurance?.payer_name ?? undefined,
  };
}

/**
 * ClaimWithDetails -> the UI Claim domain type.
 *
 * The live "SBOS HealthOS" claims table only carries the charge total and
 * workflow timestamps — everything else (payer/patient amounts, denial
 * detail, diagnosis/procedure codes, provider identity) is derived from the
 * joined child tables and the linked encounter. Two UI fields have no
 * backing data yet and are left as honest empty defaults rather than
 * fabricated: `providerNpi` (no NPI column exists anywhere in the live
 * schema) and `aiRiskScore`/`aiRiskFlags`/`plainEnglishExplanation` (fraud
 * risk is computed on demand by the /api/ai/fraud-analysis endpoint, not
 * persisted, so there is nothing to read back for the queue view).
 */
export function mapClaim(row: ClaimWithDetails): Claim {
  const payments = row.claim_payments ?? [];
  const adjustments = row.claim_adjustments ?? [];
  const denials = row.claim_denials ?? [];
  const events = row.claim_status_events ?? [];
  const diagnosisCodes = row.encounter?.encounter_diagnoses ?? [];

  const claimLevelDenial = denials
    .filter((d) => d.claim_line_id === null)
    .sort((a, b) => (a.denied_at < b.denied_at ? 1 : -1))[0] ?? null;

  return {
    id: row.id,
    claimNumber: row.claim_number,
    patientId: row.patient_id,
    patientName: row.patient?.full_name ?? 'Unknown Patient',
    providerName: row.encounter?.provider?.full_name ?? 'Unknown Provider',
    providerNpi: '',
    serviceDate: row.encounter?.encounter_date ?? '',
    submittedDate: (row.submitted_at ?? row.created_at ?? '').slice(0, 10),
    diagnosisCodes: diagnosisCodes.map((d) => d.diagnosis?.code).filter((c): c is string => !!c),
    procedureCodes: (row.claim_lines ?? []).map((l) => l.procedure_code),
    totalBilled: centsToDollars(row.total_charge_cents),
    planCoveredAmount: centsToDollars(sumPayments(payments, 'payer')),
    patientResponsibility: centsToDollars(calculatePatientResponsibilityCents(row.total_charge_cents, payments, adjustments)),
    status: row.status,
    aiRiskScore: 0,
    aiRiskFlags: [],
    plainEnglishExplanation: '',
    denialCode: (claimLevelDenial?.denial_code as Claim['denialCode']) ?? (row.denial_reason ? 'OTHER' : null),
    denialReason: claimLevelDenial?.denial_reason ?? row.denial_reason ?? null,
    adjudicationMethod: parseAdjudicationMethod(events, row.status),
  };
}

/** '14:30' (24h) -> '2:30 PM'. Pure/deterministic for testing. */
export function formatTime24to12(hhmm: string): string {
  const [hStr, m] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m ?? '00'} ${period}`;
}

/**
 * AppointmentWithNames -> the UI Appointment domain type. Proposed schema
 * (see AppointmentRow) — providerSpecialty has no live source since there is
 * no providers table, so it is left blank here; callers that already know the
 * specialty client-side (e.g. ProviderSearch composing from the selected
 * Provider) can still fill it in when constructing the UI object directly.
 */
export function mapAppointment(row: AppointmentWithNames): Appointment {
  const iso = row.scheduled_at ?? '';
  return {
    id: row.id,
    patientId: row.patient_id ?? '',
    patientName: row.patient?.full_name ?? 'Unknown Patient',
    providerId: row.provider_id ?? '',
    providerName: row.provider?.full_name ?? 'Unknown Provider',
    providerSpecialty: '',
    date: iso.slice(0, 10),
    time: iso.length >= 16 ? formatTime24to12(iso.slice(11, 16)) : '',
    type: row.appointment_type === 'telehealth' ? 'telehealth' : 'in_person',
    reason: row.chief_complaint ?? '',
    status: row.status,
    meetLink: row.telehealth_room_url ?? undefined,
  };
}

// DB rx_status has expired/discontinued which the UI domain collapses to 'completed'.
const RX_STATUS_MAP: Record<DbRxStatus, Prescription['status']> = {
  active: 'active',
  refill_requested: 'refill_requested',
  expired: 'completed',
  discontinued: 'completed',
};

/** PrescriptionWithProvider -> the UI Prescription domain type. */
export function mapPrescription(row: PrescriptionWithProvider): Prescription {
  return {
    id: row.id,
    patientId: row.patient_id ?? undefined,
    medicationName: row.medication_name,
    dosage: row.dosage,
    frequency: row.frequency,
    prescribedBy: row.provider?.user?.full_name ?? 'Unknown Provider',
    refillsRemaining: row.refills_remaining,
    pharmacyName: row.pharmacy_name ?? '',
    status: RX_STATUS_MAP[row.status],
  };
}

const EMPTY_VITALS = { bloodPressure: '—', heartRate: 0, spO2: 0, weightLbs: 0, date: '—' };

/**
 * PatientWithDetails -> the EHR Patient domain type. Live `patients` carries
 * name/dob/gender/phone/email/address directly (no user join needed);
 * insurance member ID / group number come from the joined insurance_info row
 * when one exists. Clinical fields with no live table yet (blood type,
 * allergies, chronic conditions, vitals, family members, PCP) are left as
 * honest empty states rather than fabricated.
 */
export function mapPatient(row: PatientWithDetails): Patient {
  return {
    id: row.id,
    name: row.full_name || 'Unknown Patient',
    dob: row.date_of_birth ?? '',
    gender: row.gender ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    insuranceId: row.insurance?.member_id ?? '',
    policyGroup: row.insurance?.group_number ?? '',
    primaryCarePhysician: '',
    bloodType: '',
    allergies: [],
    chronicConditions: [],
    recentVitals: EMPTY_VITALS,
    familyMembers: [],
  };
}

/**
 * ProviderIdentityRow (users where role = 'provider') -> Provider search
 * display model. There is no providers table live, so specialty/NPI/license/
 * fee/accepting-new-patients have no source and stay honest placeholders —
 * `inNetwork`/`acceptsNewPatients` default true is a pre-existing UI
 * convention in this mapper (not new), not a claim about verified data.
 */
export function mapProvider(row: ProviderIdentityRow): Provider {
  const name = row.full_name || 'Unknown Provider';
  return {
    id: row.id,
    name,
    specialty: '',
    npi: '',
    rating: 0,
    reviewCount: 0,
    inNetwork: true,
    hospitalAffiliation: row.organization_id ? 'Organization network' : 'Network not assigned',
    address: '',
    phone: '',
    nextAvailableSlot: 'Check scheduling',
    avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
    acceptsNewPatients: true,
    bio: `Live provider — no specialty/bio data captured yet (no providers table in the live schema).`,
    education: '',
  };
}

const ORG_TYPE_BADGE: Record<DbOrgType, string> = {
  health_system: 'Health System',
  payer: 'Commercial Payer',
  employer_group: 'Enterprise Sponsor',
  clinic: 'Clinic Network',
};

/**
 * OrganizationRow -> the org-context TenantOrg view. Live organizations has
 * no `type`/`tax_id`/`npi` columns yet (cosmetic-only, not access control —
 * see the DbOrgType comment) — when absent, `type` defaults to
 * 'health_system' (a neutral, non-privileged bucket; it never defaults to
 * 'payer' so a row we know nothing about never silently unlocks payer-tier
 * display) and the badge honestly reads 'Organization' instead of a specific
 * classification we don't have.
 */
export function mapOrganizationToTenantOrg(row: OrganizationRow): TenantOrg {
  // TenantOrg.type has no 'clinic' member; collapse clinic into health_system
  // for the context's coarse grouping (display badge still shows "Clinic Network").
  const type: TenantOrg['type'] =
    !row.type ? 'health_system' : row.type === 'clinic' ? 'health_system' : row.type;

  const npiOrTaxId = row.npi
    ? `NPI: ${row.npi}`
    : row.tax_id
      ? `Tax ID: ${row.tax_id}`
      : '—';

  return {
    id: row.id,
    name: row.name,
    type,
    badge: row.type ? ORG_TYPE_BADGE[row.type] : 'Organization',
    npiOrTaxId,
  };
}

/**
 * AuditLogRow -> AuditLog domain. `userName`/`role` come from the actor profile
 * (pass it when available); falls back to the actor id / 'admin' otherwise.
 * complianceLevel is derived from the action, not stored — documented as such.
 */
export function mapAuditLog(row: AuditLogRow, actor?: UserRow): AuditLog {
  const compliance: AuditLog['complianceLevel'] = row.action.startsWith('SECURITY_')
    ? 'CRITICAL_ACCESS'
    : row.actor_id
      ? 'HIPAA_STANDARD'
      : 'SYSTEM_EVENT';

  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.actor_id ?? 'system',
    userName: actor?.full_name ?? row.actor_id ?? 'System',
    role: (actor?.role as Role) ?? 'admin',
    action: row.action,
    resource: row.resource_id
      ? `${row.resource_type}: ${row.resource_id}`
      : row.resource_type,
    ipAddress: row.ip_address ?? '0.0.0.0',
    complianceLevel: compliance,
  };
}
