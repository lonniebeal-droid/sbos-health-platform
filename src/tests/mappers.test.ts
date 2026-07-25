import { describe, it, expect } from 'vitest';
import { mapOrganizationToTenantOrg, mapAuditLog, mapPatient, mapAppointment, formatTime24to12, mapClaim, mapPriorAuth } from '../lib/db/mappers';
import type { OrganizationRow, AuditLogRow, UserRow, PatientWithUser, AppointmentWithNames, ClaimWithNames, PriorAuthorizationWithNames } from '../lib/db/database.types';

const baseOrg: OrganizationRow = {
  id: 'org-1', name: 'Bay Area Health System', type: 'health_system',
  tax_id: '94-1829012', npi: '1882901230',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('mapOrganizationToTenantOrg', () => {
  it('maps core fields and prefers NPI for the identifier', () => {
    const t = mapOrganizationToTenantOrg(baseOrg);
    expect(t).toMatchObject({ id: 'org-1', name: 'Bay Area Health System', type: 'health_system' });
    expect(t.npiOrTaxId).toBe('NPI: 1882901230');
    expect(t.badge).toBe('Health System');
  });

  it('falls back to Tax ID when NPI is absent', () => {
    const t = mapOrganizationToTenantOrg({ ...baseOrg, npi: null });
    expect(t.npiOrTaxId).toBe('Tax ID: 94-1829012');
  });

  it('collapses clinic org type to health_system but keeps the clinic badge', () => {
    const t = mapOrganizationToTenantOrg({ ...baseOrg, type: 'clinic' });
    expect(t.type).toBe('health_system');
    expect(t.badge).toBe('Clinic Network');
  });
});

const baseLog: AuditLogRow = {
  id: 'log-1', organization_id: 'org-1', actor_id: 'user-1',
  action: 'EHR_RECORD_VIEW', resource_type: 'Patient', resource_id: 'pat-1',
  details: null, ip_address: '10.0.0.1', timestamp: '2026-07-24T18:00:00Z',
};

describe('mapAuditLog', () => {
  it('uses the actor profile for name/role when provided', () => {
    const actor: UserRow = {
      id: 'user-1', organization_id: 'org-1', email: 'j@x.com',
      role: 'provider', full_name: 'Dr. J', phone: null, is_active: true,
      created_at: '2026-01-01T00:00:00Z',
    };
    const log = mapAuditLog(baseLog, actor);
    expect(log.userName).toBe('Dr. J');
    expect(log.role).toBe('provider');
    expect(log.resource).toBe('Patient: pat-1');
    expect(log.complianceLevel).toBe('HIPAA_STANDARD');
  });

  it('flags SECURITY_ actions as CRITICAL_ACCESS', () => {
    const log = mapAuditLog({ ...baseLog, action: 'SECURITY_MFA_ENFORCE' });
    expect(log.complianceLevel).toBe('CRITICAL_ACCESS');
  });

  it('treats actor-less entries as SYSTEM_EVENT', () => {
    const log = mapAuditLog({ ...baseLog, actor_id: null });
    expect(log.complianceLevel).toBe('SYSTEM_EVENT');
    expect(log.userName).toBe('System');
  });
});

const basePatientRow: PatientWithUser = {
  id: 'pat-1', user_id: 'u-1', organization_id: 'org-1',
  dob: '1988-04-12', gender: 'Female', address: '742 Evergreen Terrace',
  insurance_member_id: 'SBOS-98421092', policy_group_number: 'GOLD-PPO',
  blood_type: 'A+', allergies: ['Penicillin'], chronic_conditions: ['Asthma'],
  recent_vitals: { bloodPressure: '118/76', heartRate: 72, spO2: 99, weightLbs: 142, date: '2026-07-20' },
  family_members: [{ id: 'fm1', name: 'David', relation: 'Spouse', dob: '1986-09-18' }],
  primary_care_physician: 'Dr. Wilson', created_at: '2026-01-01T00:00:00Z',
  user: { full_name: 'Sarah Jenkins', email: 'sarah@x.com', phone: '(555) 382-9102' },
};

describe('mapPatient', () => {
  it('pulls name/email/phone from the joined user and keeps clinical fields', () => {
    const p = mapPatient(basePatientRow);
    expect(p.name).toBe('Sarah Jenkins');
    expect(p.email).toBe('sarah@x.com');
    expect(p.phone).toBe('(555) 382-9102');
    expect(p.recentVitals.bloodPressure).toBe('118/76');
    expect(p.familyMembers).toHaveLength(1);
    expect(p.primaryCarePhysician).toBe('Dr. Wilson');
  });

  it('degrades gracefully when the user join and vitals are missing', () => {
    const p = mapPatient({ ...basePatientRow, user: null, recent_vitals: null });
    expect(p.name).toBe('Unknown Patient');
    expect(p.recentVitals.heartRate).toBe(0);
  });
});

describe('formatTime24to12', () => {
  it('converts 24h to 12h', () => {
    expect(formatTime24to12('10:00')).toBe('10:00 AM');
    expect(formatTime24to12('14:30')).toBe('2:30 PM');
    expect(formatTime24to12('00:15')).toBe('12:15 AM');
    expect(formatTime24to12('12:00')).toBe('12:00 PM');
  });
});

describe('mapAppointment', () => {
  const row: AppointmentWithNames = {
    id: 'apt-1', patient_id: 'pat-1', provider_id: 'prov-1', organization_id: 'org-1',
    appointment_type: 'telehealth', status: 'scheduled', scheduled_at: '2026-07-28T10:00:00Z',
    telehealth_room_url: 'https://sbos.health/meet/x', chief_complaint: 'Wellness check',
    created_at: '2026-01-01T00:00:00Z',
    patient: { user: { full_name: 'Sarah Jenkins' } },
    provider: { specialty: 'Internal Medicine', user: { full_name: 'Dr. James Wilson' } },
  };

  it('maps names, date/time, type, reason, and meet link', () => {
    const a = mapAppointment(row);
    expect(a.patientName).toBe('Sarah Jenkins');
    expect(a.providerName).toBe('Dr. James Wilson');
    expect(a.providerSpecialty).toBe('Internal Medicine');
    expect(a.date).toBe('2026-07-28');
    expect(a.time).toBe('10:00 AM');
    expect(a.type).toBe('telehealth');
    expect(a.reason).toBe('Wellness check');
    expect(a.meetLink).toBe('https://sbos.health/meet/x');
  });

  it('maps non-telehealth types to in_person', () => {
    expect(mapAppointment({ ...row, appointment_type: 'specialist' }).type).toBe('in_person');
  });
});

describe('mapClaim', () => {
  const row: ClaimWithNames = {
    id: 'clm-1', claim_number: 'CLM-2026-884102', patient_id: 'pat-1', provider_id: 'prov-1',
    payer_organization_id: 'org-2', organization_id: 'org-1', service_date: '2026-07-10',
    total_billed: 1250, approved_amount: 1100, patient_copay: 30, status: 'paid',
    icd10_codes: ['R07.9', 'I10'], cpt_codes: ['71250', '99214'], ai_risk_score: 4, ai_risk_flags: [],
    plain_english_explanation: 'Covered at 90%.',
    patient_name: null, provider_name: null, provider_npi: null,
    created_at: '2026-07-11T00:00:00Z',
    patient: { user: { full_name: 'Sarah Jenkins' } },
    provider: { npi: '1982736410', user: { full_name: 'Dr. James Wilson' } },
  };

  it('maps names, NPI, amounts, codes, and explanation via join', () => {
    const c = mapClaim(row);
    expect(c.patientName).toBe('Sarah Jenkins');
    expect(c.providerName).toBe('Dr. James Wilson');
    expect(c.providerNpi).toBe('1982736410');
    expect(c.planCoveredAmount).toBe(1100);
    expect(c.patientResponsibility).toBe(30);
    expect(c.diagnosisCodes).toEqual(['R07.9', 'I10']);
    expect(c.submittedDate).toBe('2026-07-11');
    expect(c.plainEnglishExplanation).toBe('Covered at 90%.');
  });

  it('degrades gracefully when joins are missing', () => {
    const c = mapClaim({ ...row, patient: null, provider: null, plain_english_explanation: null });
    expect(c.patientName).toBe('Unknown Patient');
    expect(c.providerNpi).toBe('');
    expect(c.plainEnglishExplanation).toBe('');
  });

  it('prefers denormalized names (payer view, no cross-org join)', () => {
    const c = mapClaim({
      ...row, patient: null, provider: null,
      patient_name: 'Sarah Jenkins', provider_name: 'Dr. James Wilson', provider_npi: '1982736410',
    });
    expect(c.patientName).toBe('Sarah Jenkins');
    expect(c.providerName).toBe('Dr. James Wilson');
    expect(c.providerNpi).toBe('1982736410');
  });
});

describe('mapPriorAuth', () => {
  const row: PriorAuthorizationWithNames = {
    id: 'aa000000-1111-2222-3333-444455556666', patient_id: 'pat-1', provider_id: 'prov-1',
    organization_id: 'org-1', requested_service: 'Cardiac MRI with Contrast',
    icd10_code: 'I25.10', cpt_code: '75561', status: 'approved',
    clinical_notes: 'Persistent atypical angina.', ai_recommendation: 'Approve: meets InterQual.',
    created_at: '2026-07-21T00:00:00Z',
    patient: { user: { full_name: 'Sarah Jenkins' } },
    provider: { user: { full_name: 'Dr. Chloe Bennett' } },
  };

  it('maps names, codes, status, notes, and derives an auth number', () => {
    const p = mapPriorAuth(row);
    expect(p.patientName).toBe('Sarah Jenkins');
    expect(p.requestingProvider).toBe('Dr. Chloe Bennett');
    expect(p.requestedService).toBe('Cardiac MRI with Contrast');
    expect(p.cptCode).toBe('75561');
    expect(p.status).toBe('approved');
    expect(p.aiRecommendation).toBe('Approve: meets InterQual.');
    expect(p.authNumber).toBe('PA-AA000000');
  });

  it('degrades gracefully when joins are missing', () => {
    const p = mapPriorAuth({ ...row, patient: null, provider: null });
    expect(p.patientName).toBe('Unknown Patient');
    expect(p.requestingProvider).toBeUndefined();
  });
});
