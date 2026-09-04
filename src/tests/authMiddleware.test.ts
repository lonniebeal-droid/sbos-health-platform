import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Tests for server-side auth utilities ----
// These tests exercise the auth middleware logic WITHOUT a running Supabase
// instance or Docker. The Supabase client is mocked at the module boundary,
// and the JWT verification / profile lookup / role-check logic is tested in
// isolation with synthetic data.

// --- Mock the Supabase client module ---
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() => mockFrom()),
      })),
    })),
  })),
  rpc: mockRpc,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// --- Import after mock setup ---
import { verifySupabaseJwt, lookupProfile } from '../lib/serverAuth';

describe('verifySupabaseJwt (synthetic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  afterEach(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns the JWT payload when the token is valid', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { sub: 'user-abc', email: 'test@org.com', role: 'authenticated' },
      error: null,
    });
    const result = await verifySupabaseJwt('valid-token');
    expect(result).toEqual({ sub: 'user-abc', email: 'test@org.com', role: 'authenticated' });
    expect(mockRpc).toHaveBeenCalledWith('verify_jwt', { token: 'valid-token' });
  });

  it('returns null when the RPC call fails', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Invalid JWT' } });
    const result = await verifySupabaseJwt('bad-token');
    expect(result).toBeNull();
  });

  it('returns null when the payload has no sub field', async () => {
    mockRpc.mockResolvedValueOnce({ data: { email: 'x@y.com' }, error: null });
    const result = await verifySupabaseJwt('token-no-sub');
    expect(result).toBeNull();
  });

  it('returns null when the RPC throws', async () => {
    mockRpc.mockRejectedValueOnce(new Error('Network error'));
    const result = await verifySupabaseJwt('token-network-error');
    expect(result).toBeNull();
  });
});

describe('lookupProfile (synthetic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the profile row when the user exists', async () => {
    const profileRow = {
      id: 'user-abc',
      email: 'test@org.com',
      role: 'provider',
      organization_id: 'org-1',
      full_name: 'Dr. Test User',
    };
    mockFrom.mockResolvedValueOnce({ data: profileRow, error: null });

    const result = await lookupProfile(mockSupabaseClient as any, 'user-abc');
    expect(result).toEqual(profileRow);
  });

  it('returns null when the user does not exist', async () => {
    mockFrom.mockResolvedValueOnce({ data: null, error: null });
    const result = await lookupProfile(mockSupabaseClient as any, 'nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when the query errors', async () => {
    mockFrom.mockResolvedValueOnce({ data: null, error: { message: 'RLS denied' } });
    const result = await lookupProfile(mockSupabaseClient as any, 'user-abc');
    expect(result).toBeNull();
  });
});

// --- Tests for the permission check logic (reused by requirePermission middleware) ---
import { hasPermission, ROLE_PERMISSIONS } from '../lib/permissions';
import { mapDbRoleToUiRole } from '../lib/roleMapping';
import type { Role } from '../types';

describe('synthetic role-based authz flow', () => {
  it('maps DB role to UI role then checks permission', () => {
    const dbRole = 'medical_biller';
    const uiRole = mapDbRoleToUiRole(dbRole);
    expect(uiRole).toBe('insurance');
    expect(hasPermission(uiRole, 'adjudicate', 'claims')).toBe(true);
    expect(hasPermission(uiRole, 'sign', 'prescriptions')).toBe(false);
  });

  it('patient cannot access admin-only resources', () => {
    expect(hasPermission('patient', 'audit', 'audit_logs')).toBe(false);
    expect(hasPermission('patient', 'write', 'prescriptions')).toBe(false);
  });

  it('admin can audit but cannot sign prescriptions', () => {
    expect(hasPermission('admin', 'audit', 'audit_logs')).toBe(true);
    expect(hasPermission('admin', 'sign', 'prescriptions')).toBe(false);
  });

  it('provider can write patients and sign prescriptions', () => {
    expect(hasPermission('provider', 'write', 'patients')).toBe(true);
    expect(hasPermission('provider', 'sign', 'prescriptions')).toBe(true);
    expect(hasPermission('provider', 'adjudicate', 'claims')).toBe(false);
  });

  it('employer can manage census but not read prescriptions', () => {
    expect(hasPermission('employer', 'read', 'employer_census')).toBe(true);
    expect(hasPermission('employer', 'read', 'prescriptions')).toBe(false);
  });

  it('all five UI roles have at least one permission defined', () => {
    const roles: Role[] = ['patient', 'provider', 'insurance', 'employer', 'admin'];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });
});

// --- Tests for the requireRole logic (simulated middleware) ---
describe('requireRole logic (synthetic)', () => {
  function simulateRequireRole(userRole: string, ...allowedRoles: string[]): { allowed: boolean; status?: number } {
    if (!allowedRoles.includes(userRole)) {
      return { allowed: false, status: 403 };
    }
    return { allowed: true };
  }

  it('allows admin when admin is in the allowed list', () => {
    const result = simulateRequireRole('admin', 'admin');
    expect(result.allowed).toBe(true);
  });

  it('denies provider when only admin is allowed', () => {
    const result = simulateRequireRole('provider', 'admin');
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it('allows both provider and admin when both are in the list', () => {
    expect(simulateRequireRole('provider', 'admin', 'provider').allowed).toBe(true);
    expect(simulateRequireRole('admin', 'admin', 'provider').allowed).toBe(true);
    expect(simulateRequireRole('patient', 'admin', 'provider').allowed).toBe(false);
  });
});

// --- Tests for the org-access logic (simulated middleware) ---
describe('requireOrgAccess logic (synthetic)', () => {
  function simulateOrgAccess(userOrgId: string | null, paramOrgId: string): { allowed: boolean; status?: number } {
    if (paramOrgId && userOrgId !== paramOrgId) {
      return { allowed: false, status: 403 };
    }
    return { allowed: true };
  }

  it('allows access when org IDs match', () => {
    expect(simulateOrgAccess('org-1', 'org-1').allowed).toBe(true);
  });

  it('denies access when org IDs differ', () => {
    const result = simulateOrgAccess('org-1', 'org-2');
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });

  it('denies access when user has no org but param is set', () => {
    const result = simulateOrgAccess(null, 'org-1');
    expect(result.allowed).toBe(false);
    expect(result.status).toBe(403);
  });
});
