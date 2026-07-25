import { describe, it, expect } from 'vitest';
import { hasPermission, ROLE_PERMISSIONS } from '../lib/permissions';
import type { Role } from '../types';

// Real unit tests for the RBAC permission matrix (src/lib/permissions.ts).
// NOTE: this function is correct but is NOT yet enforced on any API route or UI
// action (see SECURITY_AUDIT.md §1). These tests cover the matrix only.

describe('hasPermission — patient', () => {
  it('can read prescriptions but cannot write them', () => {
    expect(hasPermission('patient', 'read', 'prescriptions')).toBe(true);
    expect(hasPermission('patient', 'write', 'prescriptions')).toBe(false);
  });

  it('can read and pay bills', () => {
    expect(hasPermission('patient', 'read', 'billing')).toBe(true);
    expect(hasPermission('patient', 'write', 'billing')).toBe(true);
  });

  it('cannot access audit logs', () => {
    expect(hasPermission('patient', 'read', 'audit_logs')).toBe(false);
    expect(hasPermission('patient', 'audit', 'audit_logs')).toBe(false);
  });
});

describe('hasPermission — provider', () => {
  it('can write and sign prescriptions', () => {
    expect(hasPermission('provider', 'write', 'prescriptions')).toBe(true);
    expect(hasPermission('provider', 'sign', 'prescriptions')).toBe(true);
  });

  it('can read and write patient records', () => {
    expect(hasPermission('provider', 'read', 'patients')).toBe(true);
    expect(hasPermission('provider', 'write', 'patients')).toBe(true);
  });

  it('cannot adjudicate claims (payer-only)', () => {
    expect(hasPermission('provider', 'adjudicate', 'claims')).toBe(false);
  });
});

describe('hasPermission — insurance (payer)', () => {
  it('can adjudicate claims and prior auth', () => {
    expect(hasPermission('insurance', 'adjudicate', 'claims')).toBe(true);
    expect(hasPermission('insurance', 'adjudicate', 'prior_auth')).toBe(true);
  });

  it('cannot write patient records', () => {
    expect(hasPermission('insurance', 'write', 'patients')).toBe(false);
  });
});

describe('hasPermission — employer', () => {
  it('can manage employer census', () => {
    expect(hasPermission('employer', 'read', 'employer_census')).toBe(true);
    expect(hasPermission('employer', 'write', 'employer_census')).toBe(true);
  });

  it('cannot read clinical prescriptions', () => {
    expect(hasPermission('employer', 'read', 'prescriptions')).toBe(false);
  });
});

describe('hasPermission — admin', () => {
  it('can audit audit_logs', () => {
    expect(hasPermission('admin', 'audit', 'audit_logs')).toBe(true);
  });

  it('cannot sign prescriptions (clinical-only action)', () => {
    expect(hasPermission('admin', 'sign', 'prescriptions')).toBe(false);
  });
});

describe('hasPermission — matrix integrity', () => {
  const roles: Role[] = ['patient', 'provider', 'insurance', 'employer', 'admin'];

  it('defines a permission set for every role', () => {
    for (const role of roles) {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it('returns false for an unknown role', () => {
    // @ts-expect-error — deliberately passing an invalid role
    expect(hasPermission('hacker', 'read', 'patients')).toBe(false);
  });
});
