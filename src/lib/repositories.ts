// Repository layer: typed data-access over Supabase. Each repository is a
// factory that takes a SupabaseClient, so it is trivially unit-testable with a
// fake client (see src/tests/repositories.test.ts) and works against the real
// client in the app via getRepositories().
//
// Repositories return DB row types (src/lib/db/database.types.ts). Mapping to UI
// domain types happens in callers/services via src/lib/db/mappers.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import { mapOrganizationToTenantOrg, mapOrganizationToTenant, mapAuditLog } from './db/mappers';
import type { TenantOrg } from './organizationContext';
import type { TenantOrganization } from '../types';
import type {
  OrganizationRow, OrganizationInsert, OrganizationUpdate,
  UserRow,
  PatientRow, PatientWithUser, ProviderRow, ProviderWithUser,
  AppointmentRow, AppointmentInsert, AppointmentWithNames, DbAppointmentStatus,
  ClaimRow, ClaimWithNames, DbClaimStatus,
  PrescriptionRow, PrescriptionWithProvider,
  PriorAuthorizationRow, PriorAuthorizationInsert, PriorAuthorizationWithNames, DbPriorAuthStatus,
  LabResultRow,
  MedicalRecordRow,
  BenefitsPlanRow,
  EmployerGroupRow, EmployerMemberRow,
  AuditLogRow, AuditLogWithActor, AuditLogInsert,
} from './db/database.types';

/** Throw on a Postgrest error, otherwise return the data. */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Generic read-only base shared by most repositories. */
function crud<Row>(client: SupabaseClient, table: string, orderColumn = 'created_at') {
  return {
    async list(): Promise<Row[]> {
      return unwrap<Row[]>(await client.from(table).select('*').order(orderColumn));
    },
    async getById(id: string): Promise<Row | null> {
      const res = await client.from(table).select('*').eq('id', id).maybeSingle();
      return unwrap<Row | null>(res);
    },
  };
}

export function createRepositories(client: SupabaseClient) {
  return {
    organizations: {
      ...crud<OrganizationRow>(client, 'organizations', 'name'),
      async create(payload: OrganizationInsert): Promise<OrganizationRow> {
        return unwrap<OrganizationRow>(
          await client.from('organizations').insert(payload).select().single(),
        );
      },
      /** Convenience for the org context: rows mapped to the TenantOrg view. */
      async listAsTenantOrgs(): Promise<TenantOrg[]> {
        const rows = unwrap<OrganizationRow[]>(
          await client.from('organizations').select('*').order('name'),
        );
        return rows.map(mapOrganizationToTenantOrg);
      },
      /** Rich white-label view for the admin tenant-management console. */
      async listAsTenants(): Promise<TenantOrganization[]> {
        const rows = unwrap<OrganizationRow[]>(
          await client.from('organizations').select('*').order('name'),
        );
        return rows.map(mapOrganizationToTenant);
      },
      /** Tenant-admin edit of their own organization (RLS enforces ownership). */
      async update(id: string, payload: OrganizationUpdate): Promise<OrganizationRow> {
        return unwrap<OrganizationRow>(
          await client.from('organizations').update(payload).eq('id', id).select().single(),
        );
      },
    },

    users: {
      ...crud<UserRow>(client, 'users'),
      async getByEmail(email: string): Promise<UserRow | null> {
        return unwrap<UserRow | null>(
          await client.from('users').select('*').eq('email', email).maybeSingle(),
        );
      },
    },

    medicalRecords: crud<MedicalRecordRow>(client, 'medical_records', 'record_date'),
    benefitsPlans: crud<BenefitsPlanRow>(client, 'benefits_plans', 'created_at'),
    employerGroups: crud<EmployerGroupRow>(client, 'employer_groups', 'company_name'),
    employerMembers: crud<EmployerMemberRow>(client, 'employer_members', 'full_name'),

    patients: {
      ...crud<PatientRow>(client, 'patients'),
      /** Patients with their linked user profile (name/email/phone). */
      async listDetailed(): Promise<PatientWithUser[]> {
        return unwrap<PatientWithUser[]>(
          await client
            .from('patients')
            .select('*, user:users(full_name, email, phone)')
            .order('created_at'),
        );
      },
    },
    providers: {
      ...crud<ProviderRow>(client, 'providers'),
      /** Providers with a linked user (name fallback) for the directory. */
      async listDetailed(): Promise<ProviderWithUser[]> {
        return unwrap<ProviderWithUser[]>(
          await client.from('providers').select('*, user:users(full_name)').order('rating', { ascending: false }),
        );
      },
    },
    labResults: crud<LabResultRow>(client, 'lab_results', 'result_date'),

    appointments: {
      ...crud<AppointmentRow>(client, 'appointments', 'scheduled_at'),
      /** Appointments with patient + provider display names. */
      async listDetailed(): Promise<AppointmentWithNames[]> {
        return unwrap<AppointmentWithNames[]>(
          await client
            .from('appointments')
            .select('*, patient:patients(user:users(full_name)), provider:providers(specialty, user:users(full_name))')
            .order('scheduled_at'),
        );
      },
      async create(payload: AppointmentInsert): Promise<AppointmentRow> {
        return unwrap<AppointmentRow>(
          await client.from('appointments').insert(payload).select().single(),
        );
      },
      async updateStatus(id: string, status: DbAppointmentStatus): Promise<AppointmentRow> {
        return unwrap<AppointmentRow>(
          await client.from('appointments').update({ status }).eq('id', id).select().single(),
        );
      },
    },

    claims: {
      ...crud<ClaimRow>(client, 'claims'),
      /** Claims with patient + provider display names (and provider NPI). */
      async listDetailed(): Promise<ClaimWithNames[]> {
        return unwrap<ClaimWithNames[]>(
          await client
            .from('claims')
            .select('*, patient:patients(user:users(full_name)), provider:providers(npi, user:users(full_name))')
            .order('service_date', { ascending: false }),
        );
      },
      async updateStatus(id: string, status: DbClaimStatus): Promise<ClaimRow> {
        return unwrap<ClaimRow>(
          await client.from('claims').update({ status }).eq('id', id).select().single(),
        );
      },
    },

    prescriptions: {
      ...crud<PrescriptionRow>(client, 'prescriptions'),
      /** Prescriptions with the prescribing provider's name. */
      async listDetailed(): Promise<PrescriptionWithProvider[]> {
        return unwrap<PrescriptionWithProvider[]>(
          await client
            .from('prescriptions')
            .select('*, provider:providers(user:users(full_name))')
            .order('created_at'),
        );
      },
      async requestRefill(id: string): Promise<PrescriptionRow> {
        return unwrap<PrescriptionRow>(
          await client.from('prescriptions')
            .update({ status: 'refill_requested' })
            .eq('id', id).select().single(),
        );
      },
    },

    priorAuths: {
      ...crud<PriorAuthorizationRow>(client, 'prior_authorizations'),
      /** Prior authorizations with patient + provider display names. */
      async listDetailed(): Promise<PriorAuthorizationWithNames[]> {
        return unwrap<PriorAuthorizationWithNames[]>(
          await client
            .from('prior_authorizations')
            .select('*, patient:patients(user:users(full_name)), provider:providers(user:users(full_name))')
            .order('created_at', { ascending: false }),
        );
      },
      async create(payload: PriorAuthorizationInsert): Promise<PriorAuthorizationRow> {
        return unwrap<PriorAuthorizationRow>(
          await client.from('prior_authorizations').insert(payload).select().single(),
        );
      },
      async updateStatus(id: string, status: DbPriorAuthStatus): Promise<PriorAuthorizationRow> {
        return unwrap<PriorAuthorizationRow>(
          await client.from('prior_authorizations')
            .update({ status }).eq('id', id).select().single(),
        );
      },
    },

    auditLogs: {
      async list(): Promise<AuditLogRow[]> {
        return unwrap<AuditLogRow[]>(
          await client.from('audit_logs').select('*').order('timestamp', { ascending: false }),
        );
      },
      /** Audit logs with the actor's display name (via actor_id -> users). */
      async listDetailed(): Promise<AuditLogWithActor[]> {
        return unwrap<AuditLogWithActor[]>(
          await client.from('audit_logs')
            .select('*, actor:users(full_name)')
            .order('timestamp', { ascending: false }),
        );
      },
      async record(entry: AuditLogInsert): Promise<AuditLogRow> {
        return unwrap<AuditLogRow>(
          await client.from('audit_logs').insert(entry).select().single(),
        );
      },
    },
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

/** Real repositories backed by the configured client (throws if unconfigured). */
export function getRepositories(): Repositories {
  return createRepositories(requireSupabase());
}

// Re-export the audit-log mapper so callers get domain AuditLogs conveniently.
export { mapAuditLog };
