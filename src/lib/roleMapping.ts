import type { DbUserRole } from './db/database.types';
import type { Role } from '../types';

/**
 * Maps a live `users.role` value onto the UI's `Role`. The live role CHECK
 * constraint (admin/provider/medical_biller/coder/front_desk/staff/patient)
 * predates this app's payer- and employer-facing UI, so it has no dedicated
 * billing/staff roles yet:
 *  - medical_biller / coder map onto 'insurance' — the closest existing UI
 *    surface (the claims/billing workspace) to what those roles actually do.
 *  - front_desk / staff map onto 'admin' — the general administrative
 *    surface, pending a role-specific front-desk UI.
 * 'insurance' and 'employer' pass through directly, but are PROPOSED
 * additions to the live constraint (see database.types.ts DbUserRole comment
 * and supabase/migrations/20260821000000_add_payer_employer_roles.sql, not
 * applied) — until that migration runs no live user can actually hold them.
 */
export function mapDbRoleToUiRole(dbRole: DbUserRole): Role {
  switch (dbRole) {
    case 'patient':
      return 'patient';
    case 'provider':
      return 'provider';
    case 'admin':
      return 'admin';
    case 'medical_biller':
    case 'coder':
      return 'insurance';
    case 'front_desk':
    case 'staff':
      return 'admin';
    case 'insurance':
      return 'insurance';
    case 'employer':
      return 'employer';
    default:
      return 'admin';
  }
}
