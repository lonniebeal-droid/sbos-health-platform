// Client-side route guards: role-based access control for React UI components.
//
// These wrap child components and conditionally render based on the authenticated
// user's role. They complement the server-side middleware in serverAuth.ts and
// provide a defense-in-depth check at the UI layer.

import React from 'react';
import { useAuth } from './authContext';
import { hasPermission, type Permission } from './permissions';
import type { Role } from '../types';

// ----- Role-based gate -----

interface RoleGateProps {
  /** Allowed roles. If the user's role is not in this list, children are not rendered. */
  allowedRoles: Role[];
  /** Content to render when the role matches. */
  children: React.ReactNode;
  /** Fallback content when the role does not match. Defaults to null (hidden). */
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the authenticated user holds one of the allowed roles.
 * When Supabase is not configured (dev-fallback mode), always renders children.
 */
export const RoleGate: React.FC<RoleGateProps> = ({ allowedRoles, children, fallback = null }) => {
  const { configured, role } = useAuth();
  if (!configured) return <>{children}</>;
  if (!role) return <>{fallback}</>;
  return allowedRoles.includes(role) ? <>{children}</> : <>{fallback}</>;
};

// ----- Permission-based gate -----

interface PermissionGateProps {
  action: Permission['action'];
  resource: Permission['resource'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the authenticated user's role has the specified
 * permission. When Supabase is not configured, always renders children.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ action, resource, children, fallback = null }) => {
  const { configured, role } = useAuth();
  if (!configured) return <>{children}</>;
  if (!role) return <>{fallback}</>;
  return hasPermission(role, action, resource) ? <>{children}</> : <>{fallback}</>;
};

// ----- Admin-only gate -----

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the authenticated user is an admin.
 * Convenience wrapper around RoleGate for the most common privilege check.
 */
export const AdminGate: React.FC<AdminGateProps> = ({ children, fallback = null }) => {
  return <RoleGate allowedRoles={['admin']} fallback={fallback}>{children}</RoleGate>;
};
