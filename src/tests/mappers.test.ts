import { describe, it, expect } from 'vitest';
import { mapOrganizationToTenantOrg, mapAuditLog } from '../lib/db/mappers';
import type { OrganizationRow, AuditLogRow, UserRow } from '../lib/db/database.types';

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
