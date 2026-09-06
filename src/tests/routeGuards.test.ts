import { describe, it, expect, vi } from 'vitest';

// ---- Tests for client-side route guards (RoleGate, PermissionGate, AdminGate) ----
// These tests verify the gate logic using the real permission matrix and role
// mapping — no React rendering required, just pure logic checks.

import { hasPermission, ROLE_PERMISSIONS } from '../lib/permissions';
import { mapDbRoleToUiRole } from '../lib/roleMapping';
import type { Role } from '../types';

// Simulate the RoleGate rendering logic (matches src/lib/routeGuards.ts RoleGate).
function simulateRoleGate(userRole: Role | null, allowedRoles: Role[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

// Simulate the PermissionGate rendering logic (matches src/lib/routeGuards.ts PermissionGate).
function simulatePermissionGate(
  userRole: Role | null,
  action: string,
  resource: string,
): boolean {
  if (!userRole) return false;
  return hasPermission(userRole, action as any, resource as any);
}

// Simulate the AdminGate rendering logic.
function simulateAdminGate(userRole: Role | null): boolean {
  return simulateRoleGate(userRole, ['admin']);
}

describe('RoleGate logic', () => {
  it('renders for matching role', () => {
    expect(simulateRoleGate('admin', ['admin'])).toBe(true);
    expect(simulateRoleGate('provider', ['admin', 'provider'])).toBe(true);
  });

  it('hides for non-matching role', () => {
    expect(simulateRoleGate('patient', ['admin'])).toBe(false);
    expect(simulateRoleGate('provider', ['admin'])).toBe(false);
  });

  it('hides when role is null (unauthenticated)', () => {
    expect(simulateRoleGate(null, ['admin'])).toBe(false);
  });

  it('renders for any of multiple allowed roles', () => {
    const roles: Role[] = ['patient', 'provider', 'insurance', 'employer', 'admin'];
    for (const role of roles) {
      expect(simulateRoleGate(role, ['admin', 'provider'])).toBe(
        role === 'admin' || role === 'provider',
      );
    }
  });
});

describe('PermissionGate logic', () => {
  it('renders when the user has the required permission', () => {
    expect(simulatePermissionGate('insurance', 'adjudicate', 'claims')).toBe(true);
    expect(simulatePermissionGate('provider', 'sign', 'prescriptions')).toBe(true);
    expect(simulatePermissionGate('patient', 'read', 'billing')).toBe(true);
  });

  it('hides when the user lacks the required permission', () => {
    expect(simulatePermissionGate('patient', 'write', 'prescriptions')).toBe(false);
    expect(simulatePermissionGate('provider', 'adjudicate', 'claims')).toBe(false);
    expect(simulatePermissionGate('admin', 'sign', 'prescriptions')).toBe(false);
  });

  it('hides when role is null', () => {
    expect(simulatePermissionGate(null, 'read', 'patients')).toBe(false);
  });

  it('all five roles have at least one permission', () => {
    const roles: Role[] = ['patient', 'provider', 'insurance', 'employer', 'admin'];
    for (const role of roles) {
      const perms = ROLE_PERMISSIONS[role];
      expect(perms.length).toBeGreaterThan(0);
    }
  });
});

describe('AdminGate logic', () => {
  it('renders only for admin', () => {
    expect(simulateAdminGate('admin')).toBe(true);
    expect(simulateAdminGate('provider')).toBe(false);
    expect(simulateAdminGate('patient')).toBe(false);
    expect(simulateAdminGate('insurance')).toBe(false);
    expect(simulateAdminGate('employer')).toBe(false);
  });

  it('hides when role is null', () => {
    expect(simulateAdminGate(null)).toBe(false);
  });
});

// --- Cross-cutting: DB role → UI role → permission gate ---
describe('end-to-end role mapping → permission gate', () => {
  it('medical_biller (DB) → insurance (UI) → can adjudicate claims', () => {
    const uiRole = mapDbRoleToUiRole('medical_biller');
    expect(uiRole).toBe('insurance');
    expect(simulatePermissionGate(uiRole, 'adjudicate', 'claims')).toBe(true);
  });

  it('front_desk (DB) → admin (UI) → can audit logs', () => {
    const uiRole = mapDbRoleToUiRole('front_desk');
    expect(uiRole).toBe('admin');
    expect(simulatePermissionGate(uiRole, 'audit', 'audit_logs')).toBe(true);
  });

  it('coder (DB) → insurance (UI) → cannot sign prescriptions', () => {
    const uiRole = mapDbRoleToUiRole('coder');
    expect(uiRole).toBe('insurance');
    expect(simulatePermissionGate(uiRole, 'sign', 'prescriptions')).toBe(false);
  });

  it('staff (DB) → admin (UI) → cannot sign prescriptions', () => {
    const uiRole = mapDbRoleToUiRole('staff');
    expect(uiRole).toBe('admin');
    expect(simulatePermissionGate(uiRole, 'sign', 'prescriptions')).toBe(false);
  });

  it('patient (DB) → patient (UI) → cannot audit or write prescriptions', () => {
    const uiRole = mapDbRoleToUiRole('patient');
    expect(uiRole).toBe('patient');
    expect(simulatePermissionGate(uiRole, 'audit', 'audit_logs')).toBe(false);
    expect(simulatePermissionGate(uiRole, 'write', 'prescriptions')).toBe(false);
  });
});
