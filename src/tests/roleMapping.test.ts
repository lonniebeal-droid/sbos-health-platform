import { describe, it, expect } from 'vitest';
import { mapDbRoleToUiRole } from '../lib/roleMapping';

describe('mapDbRoleToUiRole', () => {
  it('passes through roles that exist identically in both the live schema and the UI', () => {
    expect(mapDbRoleToUiRole('patient')).toBe('patient');
    expect(mapDbRoleToUiRole('provider')).toBe('provider');
    expect(mapDbRoleToUiRole('admin')).toBe('admin');
  });

  it('maps billing/coding staff onto the insurance (claims) workspace', () => {
    expect(mapDbRoleToUiRole('medical_biller')).toBe('insurance');
    expect(mapDbRoleToUiRole('coder')).toBe('insurance');
  });

  it('maps general office staff onto the admin surface', () => {
    expect(mapDbRoleToUiRole('front_desk')).toBe('admin');
    expect(mapDbRoleToUiRole('staff')).toBe('admin');
  });

  it('passes through the proposed payer/employer roles directly', () => {
    expect(mapDbRoleToUiRole('insurance')).toBe('insurance');
    expect(mapDbRoleToUiRole('employer')).toBe('employer');
  });
});
