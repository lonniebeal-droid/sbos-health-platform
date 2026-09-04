// Server-side JWT verification and role-based authorization middleware.
//
// Uses Supabase's jwt() SQL function to verify tokens server-side without
// importing the full Supabase client. Tokens are standard Supabase JWTs with
// claims: sub (auth user id), email, role, and app_metadata/user_metadata.
//
// This module is server-only (never imported by client code).

import type { Request, Response, NextFunction } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// ----- Types -----

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

// ----- Client singleton -----

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL must be set for server-side auth verification.',
    );
  }
  _adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

// ----- JWT verification via Supabase RPC -----

/**
 * Verify a Supabase JWT and return the auth user ID, or null if invalid.
 * Uses Supabase's built-in jwt() SQL function via the service-role client.
 */
export async function verifySupabaseJwt(token: string): Promise<{ sub: string; email: string; role: string } | null> {
  try {
    const client = getAdminClient();
    const { data, error } = await client.rpc('verify_jwt', { token });
    if (error || !data) return null;
    // data contains { sub, email, role, ... } from the JWT payload
    const payload = data as Record<string, unknown>;
    if (typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      email: (payload.email as string) ?? '',
      role: (payload.role as string) ?? 'authenticated',
    };
  } catch {
    return null;
  }
}

// ----- Profile lookup -----

/**
 * Look up the application profile (public.users) for a verified auth user.
 * Returns the profile row or null if not found.
 */
export async function lookupProfile(
  client: SupabaseClient,
  authUserId: string,
): Promise<{ id: string; email: string; role: string; organization_id: string | null; full_name: string } | null> {
  const { data, error } = await client
    .from('users')
    .select('id, email, role, organization_id, full_name')
    .eq('id', authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// ----- Middleware factories -----

/**
 * Extract the Bearer token from the Authorization header.
 */
function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/**
 * Express middleware: verifies the Supabase JWT and attaches `req.authUser`.
 * Returns 401 if the token is missing, invalid, or the user profile is not found.
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const jwtPayload = await verifySupabaseJwt(token);
    if (!jwtPayload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const client = getAdminClient();
    const profile = await lookupProfile(client, jwtPayload.sub);
    if (!profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.authUser = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organizationId: profile.organization_id,
      fullName: profile.full_name,
    };

    next();
  };
}

/**
 * Express middleware: requires the authenticated user to hold one of the
 * specified roles. Must be used AFTER requireAuth().
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({
        error: 'Insufficient privileges',
        required: allowedRoles,
        current: req.authUser.role,
      });
    }
    next();
  };
}

/**
 * Express middleware: requires the authenticated user to have a specific
 * permission (action + resource) as defined in src/lib/permissions.ts.
 * Must be used AFTER requireAuth().
 */
export function requirePermission(action: string, resource: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Dynamic import would create circular deps, so inline the lookup.
    // The ROLE_PERMISSIONS map is a plain object — safe to reference directly.
    const { ROLE_PERMISSIONS } = require('./permissions') as typeof import('./permissions');
    const permissions = ROLE_PERMISSIONS[req.authUser.role as keyof typeof ROLE_PERMISSIONS] ?? [];
    const allowed = permissions.some(
      (p: { action: string; resource: string }) => p.action === action && p.resource === resource,
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Permission denied',
        required: { action, resource },
        role: req.authUser.role,
      });
    }

    next();
  };
}

/**
 * Express middleware: requires the authenticated user's organization_id to
 * match the :orgId route parameter. Prevents cross-tenant API access even
 * when RLS is disabled or misconfigured. Must be used AFTER requireAuth().
 */
export function requireOrgAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const paramOrgId = req.params.orgId;
    if (paramOrgId && req.authUser.organizationId !== paramOrgId) {
      return res.status(403).json({ error: 'Cross-tenant access denied' });
    }
    next();
  };
}
