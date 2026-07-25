// Mappers: DB rows (snake_case) -> UI domain types (src/types.ts, camelCase).
//
// IMPORTANT: mappers only exist where the DB faithfully carries the data. The
// current schema is thinner than several UI domain types (e.g. Patient needs
// recentVitals / familyMembers / primaryCarePhysician, Provider needs rating /
// bio / avatar) which have no columns yet. Rather than fabricate those values,
// we do NOT provide lossy mappers for them — the repositories return raw rows,
// and the schema gaps are tracked in TECH_DEBT.md until columns/tables exist.

import type { TenantOrg } from '../organizationContext';
import type { AuditLog, Role, Patient } from '../../types';
import type { OrganizationRow, AuditLogRow, UserRow, DbOrgType, PatientWithUser } from './database.types';

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
