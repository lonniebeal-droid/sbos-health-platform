import { describe, it, expect } from 'vitest';
import { mapOrganizationToTenantOrg, mapAuditLog, mapPatient, mapProvider, mapAppointment, formatTime24to12, mapClaim, mapPriorAuth, mapMedicalRecord, mapLabResult, mapBenefitsPlan, mapPrescription } from '../lib/db/mappers';
import type { OrganizationRow, AuditLogRow, UserRow, PatientWithDetails, InsuranceInfoRow, ProviderIdentityRow, AppointmentWithNames, ClaimWithDetails, ClaimPaymentRow, ClaimAdjustmentRow, ClaimDenialRow, ClaimStatusEventRow, PriorAuthorizationWithNames, MedicalRecordRow, LabResultRow, BenefitsPlanRow, PrescriptionWithProvider } from '../lib/db/database.types';

const baseOrg: OrganizationRow = {
  id: 'org-1', name: 'Bay Area Health System', slug: 'bay-area-health-system', type: 'health_system',
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

  it('degrades honestly when the live row has no type/tax_id/npi columns yet', () => {
    const t = mapOrganizationToTenantOrg({ id: 'org-2', name: 'New Org', slug: 'new-org', created_at: '', updated_at: '' });
    expect(t.type).toBe('health_system');
    expect(t.badge).toBe('Organization');
    expect(t.npiOrTaxId).toBe('—');
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
      role: 'provider', full_name: 'Dr. J', is_active: true,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
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

const baseInsurance: InsuranceInfoRow = {
  id: 'ins-1', organization_id: 'org-1', patient_id: 'pat-1', payer_name: 'SBOS Gold Premier PPO',
  plan_name: 'Gold PPO', member_id: 'SBOS-98421092', group_number: 'GOLD-PPO',
  policy_holder_name: 'Sarah Jenkins', relationship_to_patient: 'self',
  coverage_start_date: '2026-01-01', coverage_end_date: null, status: 'active',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const basePatientRow: PatientWithDetails = {
  id: 'pat-1', organization_id: 'org-1', user_id: 'u-1',
  full_name: 'Sarah Jenkins', date_of_birth: '1988-04-12', gender: 'Female',
  email: 'sarah@x.com', phone: '(555) 382-9102', address: '742 Evergreen Terrace',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  insurance: baseInsurance,
};

describe('mapPatient', () => {
  it('pulls name/email/phone/address directly off the live patients row', () => {
    const p = mapPatient(basePatientRow);
    expect(p.name).toBe('Sarah Jenkins');
    expect(p.email).toBe('sarah@x.com');
    expect(p.phone).toBe('(555) 382-9102');
    expect(p.insuranceId).toBe('SBOS-98421092');
    expect(p.policyGroup).toBe('GOLD-PPO');
  });

  it('degrades gracefully when insurance is missing and honestly empties clinical fields with no live table', () => {
    const p = mapPatient({ ...basePatientRow, full_name: '', insurance: null });
    expect(p.name).toBe('Unknown Patient');
    expect(p.insuranceId).toBe('');
    expect(p.policyGroup).toBe('');
    expect(p.recentVitals.heartRate).toBe(0);
    expect(p.allergies).toEqual([]);
    expect(p.familyMembers).toEqual([]);
  });
});

describe('mapProvider', () => {
  const providerRow: ProviderIdentityRow = {
    id: 'prov-1', organization_id: 'org-1', full_name: 'Dr. James Wilson', is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('maps identity from a users row (no live providers table) and leaves unavailable fields honest', () => {
    const p = mapProvider(providerRow);
    expect(p.name).toBe('Dr. James Wilson');
    expect(p.specialty).toBe('');
    expect(p.npi).toBe('');
    expect(p.hospitalAffiliation).toBe('Organization network');
  });

  it('falls back to Unknown Provider and Network not assigned when name/org are missing', () => {
    const p = mapProvider({ ...providerRow, full_name: '', organization_id: null });
    expect(p.name).toBe('Unknown Provider');
    expect(p.hospitalAffiliation).toBe('Network not assigned');
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
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    patient: { full_name: 'Sarah Jenkins' },
    provider: { full_name: 'Dr. James Wilson' },
  };

  it('maps names, date/time, type, reason, and meet link', () => {
    const a = mapAppointment(row);
    expect(a.patientName).toBe('Sarah Jenkins');
    expect(a.providerName).toBe('Dr. James Wilson');
    // No live providers table yet, so specialty has no source here — callers
    // that already know it (ProviderSearch.tsx) fill it in client-side.
    expect(a.providerSpecialty).toBe('');
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

describe('mapPrescription', () => {
  const row: PrescriptionWithProvider = {
    id: 'rx-1',
    patient_id: 'pat-1',
    provider_id: 'prov-1',
    organization_id: 'org-1',
    medication_name: 'Atorvastatin',
    dosage: '20mg tablet',
    frequency: 'Take 1 tablet nightly',
    refills_remaining: 2,
    pharmacy_name: 'Mission Pharmacy',
    status: 'active',
    created_at: '2026-07-22T00:00:00Z',
    updated_at: '2026-07-22T00:00:00Z',
    provider: { full_name: 'Dr. James Wilson' },
  };

  it('maps live prescriptions with provider and pharmacy details', () => {
    const rx = mapPrescription(row);
    expect(rx).toMatchObject({
      id: 'rx-1',
      patientId: 'pat-1',
      medicationName: 'Atorvastatin',
      dosage: '20mg tablet',
      frequency: 'Take 1 tablet nightly',
      prescribedBy: 'Dr. James Wilson',
      refillsRemaining: 2,
      pharmacyName: 'Mission Pharmacy',
      status: 'active',
    });
  });

  it('collapses expired and discontinued rows to completed in the UI', () => {
    expect(mapPrescription({ ...row, status: 'expired' }).status).toBe('completed');
    expect(mapPrescription({ ...row, status: 'discontinued' }).status).toBe('completed');
  });

  it('falls back to Unknown Provider when the provider join is missing (no live providers table)', () => {
    expect(mapPrescription({ ...row, provider: null }).prescribedBy).toBe('Unknown Provider');
  });
});

describe('mapClaim', () => {
  const payerPayment: ClaimPaymentRow = {
    id: 'pay-1', organization_id: 'org-1', claim_id: 'clm-1', claim_line_id: null,
    payment_source: 'payer', payment_method: 'manual_adjudication', amount_cents: 110000,
    reference_number: null, paid_at: '2026-07-12T00:00:00Z', posted_by_user_id: null,
    created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
  };
  const paidEvent: ClaimStatusEventRow = {
    id: 'evt-1', organization_id: 'org-1', claim_id: 'clm-1', from_status: 'in_review', to_status: 'paid',
    reason: '[manual] approved and paid $1100.00', changed_by_user_id: null, created_at: '2026-07-12T00:00:00Z',
  };

  const row: ClaimWithDetails = {
    id: 'clm-1', organization_id: 'org-1', patient_id: 'pat-1', encounter_id: 'enc-1',
    insurance_info_id: 'ins-1', claim_number: 'CLM-2026-884102', status: 'paid',
    total_charge_cents: 125000, submitted_at: '2026-07-11T00:00:00Z', reviewed_at: '2026-07-12T00:00:00Z',
    paid_at: '2026-07-12T00:00:00Z', denied_at: null, denial_reason: null, created_by_user_id: null,
    created_at: '2026-07-11T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
    patient: { full_name: 'Sarah Jenkins' },
    encounter: {
      encounter_date: '2026-07-10',
      provider: { full_name: 'Dr. James Wilson' },
      encounter_diagnoses: [{ diagnosis: { code: 'R07.9' } }, { diagnosis: { code: 'I10' } }],
    },
    claim_lines: [
      { id: 'line-1', organization_id: 'org-1', claim_id: 'clm-1', encounter_procedure_id: null, procedure_code: '71250', procedure_description: 'CT chest', units: 1, charge_cents: 90000, line_total_cents: 90000, status: 'approved', denial_reason: null, created_at: '2026-07-11T00:00:00Z', updated_at: '2026-07-11T00:00:00Z' },
      { id: 'line-2', organization_id: 'org-1', claim_id: 'clm-1', encounter_procedure_id: null, procedure_code: '99214', procedure_description: 'Office visit', units: 1, charge_cents: 35000, line_total_cents: 35000, status: 'approved', denial_reason: null, created_at: '2026-07-11T00:00:00Z', updated_at: '2026-07-11T00:00:00Z' },
    ],
    claim_payments: [payerPayment],
    claim_adjustments: [],
    claim_denials: [],
    claim_status_events: [paidEvent],
  };

  it('maps names, amounts, codes, and derived balances', () => {
    const c = mapClaim(row);
    expect(c.patientName).toBe('Sarah Jenkins');
    expect(c.providerName).toBe('Dr. James Wilson');
    expect(c.providerNpi).toBe('');
    expect(c.totalBilled).toBe(1250);
    expect(c.planCoveredAmount).toBe(1100);
    expect(c.patientResponsibility).toBe(150);
    expect(c.diagnosisCodes).toEqual(['R07.9', 'I10']);
    expect(c.procedureCodes).toEqual(['71250', '99214']);
    expect(c.submittedDate).toBe('2026-07-11');
    expect(c.adjudicationMethod).toBe('manual');
  });

  it('degrades gracefully when the encounter/patient joins are missing', () => {
    const c = mapClaim({ ...row, patient: null, encounter: null });
    expect(c.patientName).toBe('Unknown Patient');
    expect(c.providerName).toBe('Unknown Provider');
    expect(c.providerNpi).toBe('');
    expect(c.plainEnglishExplanation).toBe('');
    expect(c.diagnosisCodes).toEqual([]);
    expect(c.serviceDate).toBe('');
  });

  it('maps a claim-level denial from claim_denials and leaves line-level denials out of the claim summary', () => {
    const denial: ClaimDenialRow = {
      id: 'den-1', organization_id: 'org-1', claim_id: 'clm-1', claim_line_id: null,
      denial_code: 'MISSING_DOCS', denial_reason: 'Chart notes not received', denied_at: '2026-07-12T00:00:00Z',
      created_by_user_id: null, created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
    };
    const lineDenial: ClaimDenialRow = { ...denial, id: 'den-2', claim_line_id: 'line-1', denial_code: 'CODING_ERROR' };
    const c = mapClaim({
      ...row, status: 'denied', denial_reason: 'Chart notes not received',
      claim_denials: [lineDenial, denial],
      claim_status_events: [{ ...paidEvent, to_status: 'denied', reason: '[manual] denied — MISSING_DOCS: Chart notes not received' }],
    });
    expect(c.denialCode).toBe('MISSING_DOCS');
    expect(c.denialReason).toBe('Chart notes not received');
    expect(c.adjudicationMethod).toBe('manual');
  });

  it('falls back to OTHER when claims.denial_reason is set but no structured claim_denials row exists', () => {
    const c = mapClaim({ ...row, status: 'denied', denial_reason: 'Denied by payer', claim_denials: [] });
    expect(c.denialCode).toBe('OTHER');
    expect(c.denialReason).toBe('Denied by payer');
  });

  it('leaves adjudicationMethod undefined when no [automated]/[manual] status event exists', () => {
    const c = mapClaim({ ...row, claim_status_events: [] });
    expect(c.adjudicationMethod).toBeUndefined();
  });

  it('computes an auto-adjudicated claim from an [automated] status event', () => {
    const c = mapClaim({
      ...row,
      claim_status_events: [{ ...paidEvent, reason: '[automated] approved and paid $1100.00' }],
    });
    expect(c.adjudicationMethod).toBe('automated');
  });
});

describe('claimsBalance', () => {
  it('never lets patientResponsibility go negative even if payments exceed the charge', async () => {
    const { calculatePatientResponsibilityCents } = await import('../lib/claimsBalance');
    const overpay: ClaimPaymentRow = {
      id: 'pay-x', organization_id: 'org-1', claim_id: 'clm-1', claim_line_id: null,
      payment_source: 'payer', payment_method: 'manual_adjudication', amount_cents: 999999,
      reference_number: null, paid_at: '2026-07-12T00:00:00Z', posted_by_user_id: null,
      created_at: '2026-07-12T00:00:00Z', updated_at: '2026-07-12T00:00:00Z',
    };
    expect(calculatePatientResponsibilityCents(125000, [overpay], [])).toBe(0);
  });
});

describe('mapPriorAuth', () => {
  const row: PriorAuthorizationWithNames = {
    id: 'aa000000-1111-2222-3333-444455556666', patient_id: 'pat-1', provider_id: 'prov-1',
    organization_id: 'org-1', requested_service: 'Cardiac MRI with Contrast',
    icd10_code: 'I25.10', cpt_code: '75561', status: 'approved',
    clinical_notes: 'Persistent atypical angina.', ai_recommendation: 'Approve: meets InterQual.',
    created_at: '2026-07-21T00:00:00Z', updated_at: '2026-07-21T00:00:00Z',
    patient: { full_name: 'Sarah Jenkins', insurance: baseInsurance },
    provider: { full_name: 'Dr. Chloe Bennett' },
  };

  it('maps names, codes, status, notes, payer, and derives an auth number', () => {
    const p = mapPriorAuth(row);
    expect(p.patientName).toBe('Sarah Jenkins');
    expect(p.requestingProvider).toBe('Dr. Chloe Bennett');
    expect(p.requestedService).toBe('Cardiac MRI with Contrast');
    expect(p.cptCode).toBe('75561');
    expect(p.status).toBe('approved');
    expect(p.aiRecommendation).toBe('Approve: meets InterQual.');
    expect(p.authNumber).toBe('PA-AA000000');
    expect(p.payerName).toBe('SBOS Gold Premier PPO');
  });

  it('leaves payerName undefined when the patient has no linked insurance', () => {
    const p = mapPriorAuth({ ...row, patient: { full_name: 'Sarah Jenkins', insurance: null } });
    expect(p.payerName).toBeUndefined();
  });

  it('degrades gracefully when joins are missing', () => {
    const p = mapPriorAuth({ ...row, patient: null, provider: null });
    expect(p.patientName).toBe('Unknown Patient');
    expect(p.requestingProvider).toBeUndefined();
  });
});

describe('mapMedicalRecord', () => {
  const row: MedicalRecordRow = {
    id: 'rec-1', patient_id: 'pat-1', organization_id: 'org-1', record_date: '2026-07-15',
    type: 'Lab Result', title: 'CMP & Lipid Profile', doctor: 'Dr. James Wilson, MD',
    facility: 'SBOS Diagnostic Labs', summary: 'All within range.', status: 'normal',
    file_url: null, created_at: '2026-07-15T00:00:00Z',
  };

  it('maps record fields to the domain type', () => {
    const r = mapMedicalRecord(row);
    expect(r.type).toBe('Lab Result');
    expect(r.title).toBe('CMP & Lipid Profile');
    expect(r.doctor).toBe('Dr. James Wilson, MD');
    expect(r.date).toBe('2026-07-15');
    expect(r.status).toBe('normal');
    expect(r.fileUrl).toBeUndefined();
  });
});

describe('mapLabResult', () => {
  const row: LabResultRow = {
    id: 'lab-result-1',
    patient_id: 'pat-1',
    ordering_provider_id: 'prov-1',
    organization_id: 'org-1',
    loinc_code: '4548-4',
    test_name: 'Hemoglobin A1c',
    result_value: '5.4%',
    reference_range: '4.0-5.6%',
    status: 'completed',
    result_date: '2026-07-20',
    created_at: '2026-07-20T00:00:00Z',
    updated_at: '2026-07-20T00:00:00Z',
  };

  it('maps live lab results to the lab workflow display model, labeled as internal tracking (no external lab interface)', () => {
    const lab = mapLabResult(row);
    expect(lab).toMatchObject({
      id: 'lab-result-1',
      testName: 'Hemoglobin A1c',
      loinc: '4548-4',
      status: 'completed',
      date: '2026-07-20',
      source: 'live',
    });
    expect(lab.facility).not.toBe('Connected lab result');
    expect(lab.facility).not.toMatch(/quest|labcorp/i);
    expect(lab.result).toContain('5.4%');
    expect(lab.result).toContain('Reference range: 4.0-5.6%');
  });

  it('omits the reference range note when the row has none', () => {
    const lab = mapLabResult({ ...row, reference_range: null });
    expect(lab.result).toBe('5.4%');
  });
});

describe('mapBenefitsPlan', () => {
  const row: BenefitsPlanRow = {
    id: 'bp-1', patient_id: 'pat-1', organization_id: 'org-1',
    plan_id: 'SBOS-GOLD-PPO-2026', plan_name: 'Gold Premier PPO', network_type: 'PPO',
    individual_deductible: 1500, deductible_met: 1250, out_of_pocket_max: 4500, out_of_pocket_met: 1680,
    copays: { primaryCare: 20, specialist: 45, urgentCare: 50, emergencyRoom: 250, genericRx: 10 },
    created_at: '2026-01-01T00:00:00Z',
  };

  it('maps plan fields and copays', () => {
    const p = mapBenefitsPlan(row);
    expect(p.planId).toBe('SBOS-GOLD-PPO-2026');
    expect(p.networkType).toBe('PPO');
    expect(p.individualDeductible).toBe(1500);
    expect(p.copays.specialist).toBe(45);
  });

  it('defaults copays when missing', () => {
    const p = mapBenefitsPlan({ ...row, copays: {} as BenefitsPlanRow['copays'] });
    expect(p.copays.primaryCare).toBe(0);
  });
});
