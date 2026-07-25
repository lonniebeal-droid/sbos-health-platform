// Mappers: DB rows (snake_case) -> UI domain types (src/types.ts, camelCase).
//
// IMPORTANT: mappers only exist where the DB faithfully carries the data. The
// current schema is thinner than several UI domain types (e.g. Patient needs
// recentVitals / familyMembers / primaryCarePhysician, Provider needs rating /
// bio / avatar) which have no columns yet. Rather than fabricate those values,
// we do NOT provide lossy mappers for them — the repositories return raw rows,
// and the schema gaps are tracked in TECH_DEBT.md until columns/tables exist.

import type { TenantOrg } from '../organizationContext';
import type { AuditLog, Role, Patient, Prescription, Appointment, Claim, PriorAuth, MedicalRecord, BenefitsPlan, Provider, EmployerGroup, EmployerMember, TenantOrganization, TenantType } from '../../types';
import type { OrganizationRow, AuditLogRow, UserRow, DbOrgType, PatientWithUser, PrescriptionWithProvider, DbRxStatus, AppointmentWithNames, ClaimWithNames, PriorAuthorizationWithNames, MedicalRecordRow, BenefitsPlanRow, ProviderWithUser, EmployerGroupRow, EmployerMemberRow } from './database.types';

// DB org type -> UI TenantType (the UI uses a slightly different vocabulary).
const ORG_TYPE_TO_TENANT: Record<DbOrgType, TenantType> = {
  health_system: 'health_system',
  payer: 'health_plan',
  employer_group: 'employer_group',
  clinic: 'clinic_network',
};

/** OrganizationRow -> the rich TenantOrganization view (white-label admin). */
export function mapOrganizationToTenant(row: OrganizationRow): TenantOrganization {
  const planTier = (row.plan_tier as TenantOrganization['billing']['planTier']) ?? 'Enterprise SaaS';
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain ?? '',
    customDomain: row.custom_domain ?? '',
    tenantType: ORG_TYPE_TO_TENANT[row.type],
    primaryColor: row.primary_color ?? 'from-blue-600 to-indigo-600',
    accentColor: row.accent_color ?? '#2563eb',
    billing: {
      planTier,
      monthlyRate: row.monthly_rate,
      activeEnrollees: row.active_enrollees,
      renewalDate: row.renewal_date ?? '',
      status: (row.billing_status as TenantOrganization['billing']['status']) ?? 'active',
    },
    permissions: {
      telehealthEnabled: row.permissions?.telehealthEnabled ?? true,
      rcmEdiEnabled: row.permissions?.rcmEdiEnabled ?? true,
      priorAuthAiEnabled: row.permissions?.priorAuthAiEnabled ?? true,
      behavioralHealthEnabled: row.permissions?.behavioralHealthEnabled ?? true,
      employerPortalEnabled: row.permissions?.employerPortalEnabled ?? true,
      mfaEnforced: row.permissions?.mfaEnforced ?? true,
    },
    branding: {
      portalTitle: row.branding?.portalTitle ?? `${row.name} Care Portal`,
      tagline: row.branding?.tagline ?? '',
      supportEmail: row.branding?.supportEmail ?? '',
      supportPhone: row.branding?.supportPhone ?? '',
      brandThemeColor: row.branding?.brandThemeColor ?? 'blue',
    },
    usersCount: row.users_count,
  };
}

/** EmployerGroupRow -> the UI EmployerGroup domain type. */
export function mapEmployerGroup(row: EmployerGroupRow): EmployerGroup {
  return {
    id: row.id,
    companyName: row.company_name,
    groupNumber: row.group_number ?? undefined,
    activeEnrollees: row.active_enrollees,
    planType: row.plan_type ?? '',
    monthlyPremiumTotal: row.monthly_premium_total,
    renewalDate: row.renewal_date ?? '',
    wellnessParticipationRate: row.wellness_participation_rate,
    status: row.status,
  };
}

/** EmployerMemberRow -> the UI EmployerMember domain type. */
export function mapEmployerMember(row: EmployerMemberRow): EmployerMember {
  return {
    id: row.id,
    name: row.full_name,
    role: row.job_role ?? '',
    plan: row.plan ?? '',
    status: row.status,
    dependents: row.dependents,
    premiumMonthly: row.premium_monthly,
  };
}

/** ProviderWithUser -> the UI Provider (directory) domain type. */
export function mapProvider(row: ProviderWithUser): Provider {
  return {
    id: row.id,
    name: row.full_name ?? row.user?.full_name ?? 'Unknown Provider',
    specialty: row.specialty,
    npi: row.npi,
    rating: row.rating ?? 0,
    reviewCount: row.review_count ?? 0,
    inNetwork: row.in_network ?? true,
    hospitalAffiliation: row.hospital_affiliation ?? '',
    address: row.address ?? '',
    phone: row.phone ?? '',
    nextAvailableSlot: row.next_available_slot ?? 'Contact office',
    avatar: row.avatar_url ?? '',
    acceptsNewPatients: row.accepting_new_patients,
    bio: row.bio ?? '',
    education: row.education ?? '',
  };
}

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

/** PriorAuthorizationWithNames -> the UI PriorAuth domain type. */
export function mapPriorAuth(row: PriorAuthorizationWithNames): PriorAuth {
  const providerName = row.provider?.user?.full_name ?? undefined;
  const date = (row.created_at ?? '').slice(0, 10);
  return {
    id: row.id,
    authNumber: `PA-${row.id.slice(0, 8).toUpperCase()}`,
    patientId: row.patient_id ?? undefined,
    patientName: row.patient?.user?.full_name ?? 'Unknown Patient',
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
  };
}

/** ClaimWithNames -> the UI Claim domain type. */
export function mapClaim(row: ClaimWithNames): Claim {
  return {
    id: row.id,
    claimNumber: row.claim_number,
    patientId: row.patient_id ?? '',
    // Prefer the denormalized identity carried on the claim (visible to the
    // payer); fall back to the joined records (visible to same-org staff).
    patientName: row.patient_name ?? row.patient?.user?.full_name ?? 'Unknown Patient',
    providerName: row.provider_name ?? row.provider?.user?.full_name ?? 'Unknown Provider',
    providerNpi: row.provider_npi ?? row.provider?.npi ?? '',
    serviceDate: row.service_date,
    submittedDate: (row.created_at ?? '').slice(0, 10),
    diagnosisCodes: row.icd10_codes ?? [],
    procedureCodes: row.cpt_codes ?? [],
    totalBilled: row.total_billed,
    planCoveredAmount: row.approved_amount,
    patientResponsibility: row.patient_copay,
    status: row.status,
    aiRiskScore: row.ai_risk_score,
    aiRiskFlags: row.ai_risk_flags ?? [],
    plainEnglishExplanation: row.plain_english_explanation ?? '',
    paidAmount: row.paid_amount ?? 0,
    paidAt: row.paid_at ?? undefined,
    denialReason: row.denial_reason ?? undefined,
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

/** AppointmentWithNames -> the UI Appointment domain type. */
export function mapAppointment(row: AppointmentWithNames): Appointment {
  const iso = row.scheduled_at ?? '';
  return {
    id: row.id,
    patientId: row.patient_id ?? '',
    patientName: row.patient?.user?.full_name ?? 'Unknown Patient',
    providerId: row.provider_id ?? '',
    providerName: row.provider?.user?.full_name ?? 'Unknown Provider',
    providerSpecialty: row.provider?.specialty ?? '',
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

/** PatientWithUser (row + joined profile) -> the EHR Patient domain type. */
export function mapPatient(row: PatientWithUser): Patient {
  return {
    id: row.id,
    name: row.user?.full_name ?? 'Unknown Patient',
    dob: row.dob,
    gender: row.gender ?? '',
    phone: row.user?.phone ?? '',
    email: row.user?.email ?? '',
    address: row.address ?? '',
    insuranceId: row.insurance_member_id,
    policyGroup: row.policy_group_number,
    primaryCarePhysician: row.primary_care_physician ?? '',
    bloodType: row.blood_type ?? '',
    allergies: row.allergies ?? [],
    chronicConditions: row.chronic_conditions ?? [],
    recentVitals: row.recent_vitals ?? EMPTY_VITALS,
    familyMembers: row.family_members ?? [],
  };
}

const ORG_TYPE_BADGE: Record<DbOrgType, string> = {
  health_system: 'Health System',
  payer: 'Commercial Payer',
  employer_group: 'Enterprise Sponsor',
  clinic: 'Clinic Network',
};

/** OrganizationRow -> the org-context TenantOrg view. Faithful. */
export function mapOrganizationToTenantOrg(row: OrganizationRow): TenantOrg {
  // TenantOrg.type has no 'clinic' member; collapse clinic into health_system
  // for the context's coarse grouping (display badge still shows "Clinic Network").
  const type: TenantOrg['type'] =
    row.type === 'clinic' ? 'health_system' : row.type;

  const npiOrTaxId = row.npi
    ? `NPI: ${row.npi}`
    : row.tax_id
      ? `Tax ID: ${row.tax_id}`
      : '—';

  return {
    id: row.id,
    name: row.name,
    type,
    badge: ORG_TYPE_BADGE[row.type],
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
