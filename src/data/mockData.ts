import { Patient, Provider, Appointment, Claim, PriorAuth, Prescription, MedicalRecord, BIRPNote, BenefitsPlan, EmployerGroup, AuditLog, UserProfile } from '../types';

export const mockUsers: Record<string, UserProfile> = {
  patient: {
    id: 'usr_pat_101',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@example.com',
    role: 'patient',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    organization: 'Apex Global Employee Plan',
    mfaEnabled: true,
    memberId: 'SBOS-98421092',
  },
  provider: {
    id: 'usr_prv_202',
    name: 'Dr. James Wilson, MD',
    email: 'j.wilson@health.sbos.org',
    role: 'provider',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&q=80',
    organization: 'SuccessBrand Medical Group (Tenant Org)',
    mfaEnabled: true,
    npiNumber: '1982736410',
  },
  insurance: {
    id: 'usr_ins_303',
    name: 'Elena Rostova',
    email: 'elena.rostova@sbos-healthpay.com',
    role: 'insurance',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    organization: 'SBOS Health Alliance Payer Admin',
    mfaEnabled: true,
  },
  employer: {
    id: 'usr_emp_404',
    name: 'Marcus Vance',
    email: 'marcus.vance@techcorp-global.com',
    role: 'employer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    organization: 'TechCorp Global HR Benefits',
    mfaEnabled: true,
  },
  admin: {
    id: 'usr_adm_505',
    name: 'Devon Sterling',
    email: 'devon.sterling@sbos.ai',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    organization: 'SBOS Enterprise Operations & Security',
    mfaEnabled: true,
  }
};

export const samplePatient: Patient = {
  id: 'pat_001',
  name: 'Sarah Jenkins',
  dob: '1988-04-12',
  gender: 'Female',
  phone: '(555) 382-9102',
  email: 'sarah.jenkins@example.com',
  address: '742 Evergreen Terrace, San Francisco, CA 94107',
  insuranceId: 'SBOS-98421092',
  policyGroup: 'SBOS-GOLD-PPO-2026',
  primaryCarePhysician: 'Dr. James Wilson, MD',
  bloodType: 'A+',
  allergies: ['Penicillin', 'Peanuts', 'Latex'],
  chronicConditions: ['Mild Asthma', 'Essential Hypertension'],
  recentVitals: {
    bloodPressure: '118/76',
    heartRate: 72,
    spO2: 99,
    weightLbs: 142,
    date: '2026-07-20'
  },
  familyMembers: [
    { id: 'fm_001', name: 'David Jenkins', relation: 'Spouse', dob: '1986-09-18' },
    { id: 'fm_002', name: 'Leo Jenkins', relation: 'Child', dob: '2018-02-04' }
  ]
};

export const sampleProviders: Provider[] = [
  {
    id: 'prv_101',
    name: 'Dr. James Wilson, MD',
    specialty: 'Internal Medicine & Primary Care',
    npi: '1982736410',
    rating: 4.9,
    reviewCount: 184,
    inNetwork: true,
    hospitalAffiliation: 'Stanford Health Care / SBOS Medical Center',
    address: '500 Parnassus Ave, Suite 300, San Francisco, CA',
    phone: '(415) 555-0192',
    nextAvailableSlot: 'Tomorrow at 10:00 AM',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&q=80',
    acceptsNewPatients: true,
    bio: 'Board-certified internist with 14 years of clinical experience specializing in preventive health and chronic disease management.',
    education: 'Harvard Medical School (MD), Residency at Johns Hopkins Hospital'
  },
  {
    id: 'prv_102',
    name: 'Dr. Amara Patel, PsyD',
    specialty: 'Behavioral Health & Clinical Psychology',
    npi: '1482930192',
    rating: 5.0,
    reviewCount: 230,
    inNetwork: true,
    hospitalAffiliation: 'SBOS Mind Care Center',
    address: '120 Montgomery St, San Francisco, CA',
    phone: '(415) 555-0841',
    nextAvailableSlot: 'Friday at 2:30 PM',
    avatar: 'https://images.unsplash.com/photo-1594824813566-78a931448b11?auto=format&fit=crop&w=250&q=80',
    acceptsNewPatients: true,
    bio: 'Specializing in cognitive behavioral therapy (CBT), stress resilience, and evidence-based mental healthcare for working professionals.',
    education: 'Stanford University (PsyD in Clinical Psychology)'
  },
  {
    id: 'prv_103',
    name: 'Dr. Chloe Bennett, MD',
    specialty: 'Cardiology & Vascular Health',
    npi: '1839201948',
    rating: 4.8,
    reviewCount: 142,
    inNetwork: true,
    hospitalAffiliation: 'UCSF Medical Center',
    address: '400 Castro St, San Francisco, CA',
    phone: '(415) 555-0482',
    nextAvailableSlot: 'Monday at 9:00 AM',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=250&q=80',
    acceptsNewPatients: true,
    bio: 'Fellowship-trained cardiologist focusing on preventive cardiology, lipidology, and non-invasive cardiac imaging.',
    education: 'Columbia University Vagelos College of Physicians and Surgeons'
  }
];

export const sampleAppointments: Appointment[] = [
  {
    id: 'apt_101',
    patientId: 'pat_001',
    patientName: 'Sarah Jenkins',
    providerId: 'prv_101',
    providerName: 'Dr. James Wilson, MD',
    providerSpecialty: 'Internal Medicine',
    date: '2026-07-28',
    time: '10:00 AM',
    type: 'telehealth',
    reason: 'Annual Wellness Check & Routine Bloodwork Review',
    status: 'scheduled',
    meetLink: 'https://sbos.health/meet/room-v721-sarah'
  },
  {
    id: 'apt_102',
    patientId: 'pat_001',
    patientName: 'Sarah Jenkins',
    providerId: 'prv_102',
    providerName: 'Dr. Amara Patel, PsyD',
    providerSpecialty: 'Behavioral Health',
    date: '2026-08-02',
    time: '02:30 PM',
    type: 'telehealth',
    reason: 'Monthly Stress Resilience Consultation',
    status: 'scheduled',
    meetLink: 'https://sbos.health/meet/room-psy-8812'
  }
];

export const sampleClaims: Claim[] = [
  {
    id: 'clm_901',
    claimNumber: 'CLM-2026-884102',
    patientName: 'Sarah Jenkins',
    patientId: 'pat_001',
    providerName: 'SBOS Diagnostic Imaging Lab',
    providerNpi: '1293819201',
    serviceDate: '2026-07-10',
    submittedDate: '2026-07-11',
    diagnosisCodes: ['R07.9', 'I10'],
    procedureCodes: ['71250', '99214'],
    totalBilled: 1250.00,
    planCoveredAmount: 1100.00,
    patientResponsibility: 30.00,
    status: 'paid',
    aiRiskScore: 4,
    aiRiskFlags: [],
    plainEnglishExplanation: 'Chest CT scan and routine outpatient consultation. Covered at 90% in-network tier. You owe a flat $30 copay.'
  },
  {
    id: 'clm_902',
    claimNumber: 'CLM-2026-992144',
    patientName: 'Sarah Jenkins',
    patientId: 'pat_001',
    providerName: 'Bay Area Orthopedics',
    providerNpi: '1920194812',
    serviceDate: '2026-07-18',
    submittedDate: '2026-07-19',
    diagnosisCodes: ['M25.561'],
    procedureCodes: ['99203', '73560'],
    totalBilled: 840.00,
    planCoveredAmount: 760.00,
    patientResponsibility: 40.00,
    status: 'in_review',
    aiRiskScore: 12,
    aiRiskFlags: ['Minor code combination query'],
    plainEnglishExplanation: 'Knee evaluation and X-Ray. Currently undergoing automated adjudication. Estimated copay $40.'
  },
  {
    id: 'clm_903',
    claimNumber: 'CLM-2026-773109',
    patientName: 'Marcus Vance',
    patientId: 'pat_002',
    providerName: 'Metro Urgent Care',
    providerNpi: '1029384756',
    serviceDate: '2026-07-22',
    submittedDate: '2026-07-23',
    diagnosisCodes: ['J02.9'],
    procedureCodes: ['87880', '99213'],
    totalBilled: 320.00,
    planCoveredAmount: 0,
    patientResponsibility: 320.00,
    status: 'adjudicated',
    aiRiskScore: 78,
    aiRiskFlags: ['Duplicate submission detected', 'Out-of-network provider surcharge'],
    plainEnglishExplanation: 'Rapid Strep Test. Flagged by AI for potential duplicate billing with prior visit on 07/21.'
  }
];

export const samplePriorAuths: PriorAuth[] = [
  {
    id: 'pa_501',
    authNumber: 'PA-2026-00481',
    patientName: 'Sarah Jenkins',
    patientId: 'pat_001',
    requestingProvider: 'Dr. Chloe Bennett, MD',
    serviceType: 'Cardiac MRI with Contrast',
    icdCode: 'I25.10',
    cptCode: '75561',
    urgency: 'urgent',
    status: 'approved',
    requestedDate: '2026-07-21',
    aiNecessityScore: 94,
    aiRecommendation: 'Approve: Clinical documentation meets InterQual criteria for chest pain evaluation with inconclusive EKG.',
    clinicalNotesSummary: 'Patient exhibits persistent atypical angina despite medication. Prior echo showed minor ejection fraction variance.'
  },
  {
    id: 'pa_502',
    authNumber: 'PA-2026-00482',
    patientName: 'David Jenkins',
    patientId: 'pat_003',
    requestingProvider: 'Dr. Amara Patel, PsyD',
    serviceType: 'Intensive Outpatient Therapy (IOP)',
    icdCode: 'F41.1',
    cptCode: '90837',
    urgency: 'routine',
    status: 'pending',
    requestedDate: '2026-07-23',
    aiNecessityScore: 88,
    aiRecommendation: 'Recommend Approval: Generalized Anxiety Disorder refractory to 12 weeks standard weekly therapy.',
    clinicalNotesSummary: 'Weekly CBT showed moderate gains; step-up intensive care requested to avoid hospital admission.'
  }
];

export const samplePrescriptions: Prescription[] = [
  {
    id: 'rx_301',
    medicationName: 'Lisinopril',
    dosage: '10 mg Tablet',
    frequency: 'Take 1 tablet daily by mouth',
    prescribedBy: 'Dr. James Wilson, MD',
    refillsRemaining: 3,
    pharmacyName: 'Walgreens Pharmacy - #1402 Castro St',
    status: 'active',
    lastRefillDate: '2026-06-25',
    nextRefillDue: '2026-07-25'
  },
  {
    id: 'rx_302',
    medicationName: 'Albuterol HFA Inhaler',
    dosage: '90 mcg/actuation',
    frequency: 'Inhale 2 puffs every 4-6 hours as needed for shortness of breath',
    prescribedBy: 'Dr. James Wilson, MD',
    refillsRemaining: 1,
    pharmacyName: 'CVS Pharmacy - Market St',
    status: 'active',
    lastRefillDate: '2026-05-10',
    nextRefillDue: '2026-08-10'
  }
];

export const sampleMedicalRecords: MedicalRecord[] = [
  {
    id: 'rec_01',
    patientId: 'pat_001',
    date: '2026-07-15',
    type: 'Lab Result',
    title: 'Comprehensive Metabolic Panel & Lipid Profile',
    doctor: 'Dr. James Wilson, MD',
    facility: 'SBOS Diagnostic Labs',
    summary: 'Total Cholesterol: 185 mg/dL (Normal). Fasting Glucose: 92 mg/dL (Normal). Electrolytes within optimal ranges.',
    status: 'normal'
  },
  {
    id: 'rec_02',
    patientId: 'pat_001',
    date: '2026-06-10',
    type: 'Immunization',
    title: 'Tdap Booster & Annual Influenza Vaccine',
    doctor: 'Dr. James Wilson, MD',
    facility: 'Primary Care Network Clinic',
    summary: 'Administered in left deltoid. No adverse reaction observed during 15-min post-vaccine monitoring window.',
    status: 'normal'
  }
];

export const sampleBIRPNote: BIRPNote = {
  id: 'birp_701',
  patientId: 'pat_001',
  patientName: 'Sarah Jenkins',
  providerName: 'Dr. Amara Patel, PsyD',
  date: '2026-07-20',
  behavior: 'Patient presented on time for telehealth session in good affect. Expressed elevated work stress (7/10) related to recent corporate reorganization.',
  intervention: 'Utilized Cognitive Restructuring techniques (CBT) and guided diaphragmatic breathing exercise (4-7-8 method). Reviewed sleep hygiene logs.',
  response: 'Patient actively engaged in cognitive reframing exercise, reporting stress level reduction from 7/10 to 3/10 post-breathing loop.',
  plan: 'Continue bi-weekly CBT sessions. Patient to maintain stress journal and execute 5 minutes of daily breathing protocol.',
  suggestedICD: ['F41.1 (Generalized Anxiety Disorder)'],
  suggestedCPT: ['90837 (Psychotherapy, 60 minutes)'],
  status: 'signed'
};

export const sampleBenefitsPlan: BenefitsPlan = {
  planId: 'SBOS-GOLD-PPO-2026',
  planName: 'Gold Premier PPO Health Plan',
  networkType: 'PPO',
  individualDeductible: 1500,
  deductibleMet: 1250,
  outOfPocketMax: 4500,
  outOfPocketMet: 1680,
  copays: {
    primaryCare: 20,
    specialist: 45,
    urgentCare: 50,
    emergencyRoom: 250,
    genericRx: 10
  }
};

export const sampleEmployerGroups: EmployerGroup[] = [
  {
    id: 'emp_grp_01',
    companyName: 'TechCorp Global Solutions',
    activeEnrollees: 1420,
    planType: 'Gold Premier PPO + MindCare',
    monthlyPremiumTotal: 840500,
    renewalDate: '2027-01-01',
    wellnessParticipationRate: 84,
    status: 'active'
  },
  {
    id: 'emp_grp_02',
    companyName: 'Apex BioHealth Industries',
    activeEnrollees: 680,
    planType: 'Platinum Select HMO',
    monthlyPremiumTotal: 412000,
    renewalDate: '2026-11-01',
    wellnessParticipationRate: 76,
    status: 'active'
  }
];

export const sampleAuditLogs: AuditLog[] = [
  {
    id: 'log_9001',
    timestamp: '2026-07-24 18:58:12',
    userId: 'usr_prv_202',
    userName: 'Dr. James Wilson, MD',
    role: 'provider',
    action: 'EHR_RECORD_VIEW',
    resource: 'Patient: Sarah Jenkins (ID: pat_001) - Lab Results',
    ipAddress: '192.168.1.42',
    complianceLevel: 'HIPAA_STANDARD'
  },
  {
    id: 'log_9002',
    timestamp: '2026-07-24 18:45:01',
    userId: 'usr_ins_303',
    userName: 'Elena Rostova',
    role: 'insurance',
    action: 'CLAIM_ADJUDICATE',
    resource: 'Claim: CLM-2026-884102 Approved ($1100.00)',
    ipAddress: '10.0.4.19',
    complianceLevel: 'HIPAA_STANDARD'
  },
  {
    id: 'log_9003',
    timestamp: '2026-07-24 18:30:22',
    userId: 'usr_adm_505',
    userName: 'Devon Sterling',
    role: 'admin',
    action: 'SECURITY_MFA_ENFORCE',
    resource: 'Enforced MFA on Organization: TechCorp Global',
    ipAddress: '172.16.0.8',
    complianceLevel: 'CRITICAL_ACCESS'
  }
];
