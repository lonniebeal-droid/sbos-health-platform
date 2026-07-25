export type Role = 'patient' | 'provider' | 'insurance' | 'employer' | 'admin';
export type UserRole = Role;

export type TenantType = 'health_system' | 'health_plan' | 'behavioral_health' | 'employer_group' | 'clinic_network';

export interface TenantOrganization {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string;
  tenantType: TenantType;
  primaryColor: string; // TailWind color name or Hex
  accentColor: string;
  logoIconName?: string;
  billing: {
    planTier: 'Enterprise SaaS' | 'Payer Suite' | 'Health System Custom';
    monthlyRate: number;
    activeEnrollees: number;
    renewalDate: string;
    status: 'active' | 'trial' | 'past_due';
  };
  permissions: {
    telehealthEnabled: boolean;
    rcmEdiEnabled: boolean;
    priorAuthAiEnabled: boolean;
    behavioralHealthEnabled: boolean;
    employerPortalEnabled: boolean;
    mfaEnforced: boolean;
  };
  branding: {
    portalTitle: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
    brandThemeColor: string;
  };
  usersCount: number;
}

export type ClaimStatus = 'submitted' | 'in_review' | 'adjudicated' | 'approved' | 'denied' | 'paid';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  organization: string;
  mfaEnabled: boolean;
  memberId?: string;
  npiNumber?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  insuranceId: string;
  policyGroup: string;
  primaryCarePhysician: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  recentVitals: {
    bloodPressure: string;
    heartRate: number;
    spO2: number;
    weightLbs: number;
    date: string;
  };
  familyMembers?: {
    id: string;
    name: string;
    relation: string;
    dob: string;
  }[];
}

export interface Provider {
  id: string;
  name: string;
  specialty: string;
  npi: string;
  rating: number;
  reviewCount: number;
  inNetwork: boolean;
  hospitalAffiliation: string;
  address: string;
  phone: string;
  nextAvailableSlot: string;
  avatar: string;
  acceptsNewPatients: boolean;
  bio: string;
  education: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  providerSpecialty: string;
  date: string;
  time: string;
  type: 'telehealth' | 'in_person';
  reason: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  meetLink?: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  providerName: string;
  providerNpi: string;
  serviceDate: string;
  submittedDate: string;
  diagnosisCodes: string[]; // ICD-10
  procedureCodes: string[]; // CPT
  totalBilled: number;
  planCoveredAmount: number;
  patientResponsibility: number;
  status: ClaimStatus;
  aiRiskScore: number; // 0-100 fraud/abuse risk score
  aiRiskFlags: string[];
  plainEnglishExplanation: string;
  paidAmount?: number;
  paidAt?: string;
  denialReason?: string;
}

export interface PriorAuth {
  id: string;
  authNumber?: string;
  patientName: string;
  patientId?: string;
  requestingProvider?: string;
  providerName?: string;
  requestedService?: string;
  serviceType?: string;
  icd10Code?: string;
  icdCode?: string;
  cptCode?: string;
  urgency?: 'routine' | 'urgent' | 'stat';
  status: 'pending' | 'approved' | 'denied' | 'info_requested';
  requestedDate?: string;
  submittedDate?: string;
  clinicalNotes?: string;
  aiNecessityScore?: number; // 0-100 alignment with clinical guidelines
  aiRecommendation?: string;
  clinicalNotesSummary?: string;
}

export interface Prescription {
  id: string;
  patientId?: string;
  patientName?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  refillsRemaining: number;
  pharmacyName: string;
  status: 'active' | 'refill_requested' | 'completed';
  lastRefillDate?: string;
  nextRefillDue?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  date: string;
  type: 'Lab Result' | 'Immunization' | 'Visit Summary' | 'Imaging';
  title: string;
  doctor: string;
  facility: string;
  summary: string;
  status: 'normal' | 'abnormal' | 'pending';
  fileUrl?: string;
}

export interface BIRPNote {
  id: string;
  patientId: string;
  patientName: string;
  providerName: string;
  date: string;
  behavior: string;
  intervention: string;
  response: string;
  plan: string;
  suggestedICD: string[];
  suggestedCPT: string[];
  status: 'draft' | 'signed';
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  diagnosis: string;
  goals: string[];
  interventions: string[];
  status: 'active' | 'completed' | 'on_hold';
  reviewDate?: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  instrument: string;
  score: number | null;
  severity: string;
  administeredAt: string;
}

export interface BenefitsPlan {
  planId: string;
  planName: string;
  networkType: 'PPO' | 'HMO' | 'EPO';
  individualDeductible: number;
  deductibleMet: number;
  outOfPocketMax: number;
  outOfPocketMet: number;
  copays: {
    primaryCare: number;
    specialist: number;
    urgentCare: number;
    emergencyRoom: number;
    genericRx: number;
  };
}

export interface EmployerGroup {
  id: string;
  companyName: string;
  groupNumber?: string;
  activeEnrollees: number;
  planType: string;
  monthlyPremiumTotal: number;
  renewalDate: string;
  wellnessParticipationRate: number;
  status: 'active' | 'pending_renewal';
}

export interface EmployerMember {
  id: string;
  name: string;
  role: string;
  plan: string;
  status: string;
  dependents: number;
  premiumMonthly: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  action: string;
  resource: string;
  ipAddress: string;
  complianceLevel: 'HIPAA_STANDARD' | 'CRITICAL_ACCESS' | 'SYSTEM_EVENT';
}

export interface MessageParticipant {
  userId: string;
  name: string;
  role: Role;
}

export interface MessageThread {
  id: string;
  subject: string;
  lastMessageAt: string;
  participants: MessageParticipant[];
  hasUnread: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'jessie' | 'system';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
  metadata?: any;
}
