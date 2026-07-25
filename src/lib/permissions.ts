import { Role } from '../types';

export interface Permission {
  action: 'read' | 'write' | 'delete' | 'adjudicate' | 'sign' | 'audit';
  resource: 'patients' | 'claims' | 'prescriptions' | 'prior_auth' | 'billing' | 'audit_logs' | 'employer_census';
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  patient: [
    { action: 'read', resource: 'patients' },
    { action: 'read', resource: 'claims' },
    { action: 'read', resource: 'prescriptions' },
    { action: 'read', resource: 'prior_auth' },
    { action: 'read', resource: 'billing' },
    { action: 'write', resource: 'billing' }, // pay bills
  ],
  provider: [
    { action: 'read', resource: 'patients' },
    { action: 'write', resource: 'patients' },
    { action: 'read', resource: 'prescriptions' },
    { action: 'write', resource: 'prescriptions' },
    { action: 'sign', resource: 'prescriptions' },
    { action: 'read', resource: 'prior_auth' },
    { action: 'write', resource: 'prior_auth' },
  ],
  insurance: [
    { action: 'read', resource: 'claims' },
    { action: 'adjudicate', resource: 'claims' },
    { action: 'read', resource: 'prior_auth' },
    { action: 'adjudicate', resource: 'prior_auth' },
    { action: 'read', resource: 'patients' },
  ],
  employer: [
    { action: 'read', resource: 'employer_census' },
    { action: 'write', resource: 'employer_census' },
    { action: 'read', resource: 'billing' },
  ],
  admin: [
    { action: 'read', resource: 'patients' },
    { action: 'read', resource: 'claims' },
    { action: 'read', resource: 'prescriptions' },
    { action: 'read', resource: 'prior_auth' },
    { action: 'read', resource: 'billing' },
    { action: 'read', resource: 'audit_logs' },
    { action: 'audit', resource: 'audit_logs' },
    { action: 'write', resource: 'employer_census' },
  ],
};

export function hasPermission(role: Role, action: Permission['action'], resource: Permission['resource']): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.some((p) => p.action === action && p.resource === resource);
}
