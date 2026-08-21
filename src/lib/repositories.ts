// Repository layer: typed data-access over Supabase. Each repository is a
// factory that takes a SupabaseClient, so it is trivially unit-testable with a
// fake client (see src/tests/repositories.test.ts) and works against the real
// client in the app via getRepositories().
//
// Repositories return DB row types (src/lib/db/database.types.ts). Mapping to UI
// domain types happens in callers/services via src/lib/db/mappers.ts.

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import { mapOrganizationToTenantOrg, mapAuditLog } from './db/mappers';
import { dollarsToCents } from './claimsBalance';
import type { TenantOrg } from './organizationContext';
import type {
  OrganizationRow, OrganizationInsert,
  UserRow,
  PatientRow, PatientWithDetails, InsuranceInfoRow, ProviderIdentityRow,
  AppointmentRow, AppointmentInsert, AppointmentWithNames, DbAppointmentStatus,
  ClaimRow, ClaimWithDetails, DbClaimStatus,
  ClaimPaymentRow, ClaimAdjustmentRow, ClaimDenialRow, ClaimStatusEventRow,
  DbPaymentSource, DbAdjustmentType,
  PrescriptionRow, PrescriptionWithProvider,
  PriorAuthorizationRow, PriorAuthorizationInsert, PriorAuthorizationWithNames, DbPriorAuthStatus,
  LabResultRow,
  MedicalRecordRow,
  BenefitsPlanRow,
  AuditLogRow, AuditLogInsert,
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

// ----- Claims child-table writes (module-level so approve()/deny() can call
// them directly without relying on `this` binding inside the returned object). -----

async function insertClaimPayment(
  client: SupabaseClient,
  claimId: string,
  input: { source: DbPaymentSource; method: string; amountCents: number; referenceNumber?: string; postedByUserId?: string },
): Promise<ClaimPaymentRow> {
  return unwrap<ClaimPaymentRow>(
    await client
      .from('claim_payments')
      .insert({
        claim_id: claimId,
        payment_source: input.source,
        payment_method: input.method,
        amount_cents: input.amountCents,
        reference_number: input.referenceNumber ?? null,
        posted_by_user_id: input.postedByUserId ?? null,
      })
      .select()
      .single(),
  );
}

async function insertClaimAdjustment(
  client: SupabaseClient,
  claimId: string,
  input: { type: DbAdjustmentType; amountCents: number; reason?: string; createdByUserId?: string },
): Promise<ClaimAdjustmentRow> {
  return unwrap<ClaimAdjustmentRow>(
    await client
      .from('claim_adjustments')
      .insert({
        claim_id: claimId,
        adjustment_type: input.type,
        amount_cents: input.amountCents,
        reason: input.reason ?? null,
        created_by_user_id: input.createdByUserId ?? null,
      })
      .select()
      .single(),
  );
}

/** claimLineId omitted/undefined => claim-level denial; set => line-level. */
async function insertClaimDenial(
  client: SupabaseClient,
  claimId: string,
  input: { code?: string; reason: string; claimLineId?: string | null; createdByUserId?: string },
): Promise<ClaimDenialRow> {
  return unwrap<ClaimDenialRow>(
    await client
      .from('claim_denials')
      .insert({
        claim_id: claimId,
        claim_line_id: input.claimLineId ?? null,
        denial_code: input.code ?? null,
        denial_reason: input.reason,
        created_by_user_id: input.createdByUserId ?? null,
      })
      .select()
      .single(),
  );
}

async function insertClaimStatusEvent(
  client: SupabaseClient,
  claimId: string,
  fromStatus: DbClaimStatus | null,
  toStatus: DbClaimStatus,
  reason: string,
  changedByUserId?: string,
): Promise<ClaimStatusEventRow> {
  return unwrap<ClaimStatusEventRow>(
    await client
      .from('claim_status_events')
      .insert({
        claim_id: claimId,
        from_status: fromStatus,
        to_status: toStatus,
        reason,
        changed_by_user_id: changedByUserId ?? null,
      })
      .select()
      .single(),
  );
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
    insuranceInfo: crud<InsuranceInfoRow>(client, 'insurance_info'),

    patients: {
      ...crud<PatientRow>(client, 'patients'),
      /** Patients with their insurance/coverage record (member ID, group number
       * live there, not on patients — see PatientWithDetails). No user join
       * needed: live `patients` carries name/email/phone directly. */
      async listDetailed(): Promise<PatientWithDetails[]> {
        return unwrap<PatientWithDetails[]>(
          await client
            .from('patients')
            .select('*, insurance:insurance_info(*)')
            .order('created_at'),
        );
      },
    },
    /** There is no `providers` table live — provider identity is just
     * `users` filtered to role = 'provider' (see ProviderIdentityRow). */
    providers: {
      async list(): Promise<ProviderIdentityRow[]> {
        return unwrap<ProviderIdentityRow[]>(
          await client.from('users').select('id, organization_id, full_name, is_active, created_at').eq('role', 'provider').order('full_name'),
        );
      },
      async listDetailed(): Promise<ProviderIdentityRow[]> {
        return unwrap<ProviderIdentityRow[]>(
          await client.from('users').select('id, organization_id, full_name, is_active, created_at').eq('role', 'provider').order('full_name'),
        );
      },
    },
    labResults: crud<LabResultRow>(client, 'lab_results', 'result_date'),

    // PROPOSED schema — see the AppointmentRow comment in database.types.ts.
    // Not applied to the live project yet, so `.from('appointments')` calls
    // below fail there today; existing callers already catch that and fall
    // back to demo data (see ProviderSearch.tsx), so no behavior changes
    // until the migration is applied.
    appointments: {
      ...crud<AppointmentRow>(client, 'appointments', 'scheduled_at'),
      /** Appointments with patient + provider display names. */
      async listDetailed(): Promise<AppointmentWithNames[]> {
        return unwrap<AppointmentWithNames[]>(
          await client
            .from('appointments')
            .select('*, patient:patients(full_name), provider:users(full_name)')
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
      /** Claims joined with patient/provider identity, diagnosis codes, and every
       * child record (lines, payments, adjustments, denials, status history)
       * needed to derive balances — see src/lib/db/mappers.ts mapClaim(). */
      async listDetailed(): Promise<ClaimWithDetails[]> {
        return unwrap<ClaimWithDetails[]>(
          await client
            .from('claims')
            .select(`
              *,
              patient:patients(full_name),
              encounter:encounters(encounter_date, provider:users(full_name), encounter_diagnoses(diagnosis:diagnosis_codes(code))),
              claim_lines(*),
              claim_payments(*),
              claim_adjustments(*),
              claim_denials(*),
              claim_status_events(*)
            `)
            .order('created_at', { ascending: false }),
        );
      },
      recordPayment: (
        claimId: string,
        input: { source: DbPaymentSource; method: string; amountCents: number; referenceNumber?: string; postedByUserId?: string },
      ) => insertClaimPayment(client, claimId, input),
      recordAdjustment: (
        claimId: string,
        input: { type: DbAdjustmentType; amountCents: number; reason?: string; createdByUserId?: string },
      ) => insertClaimAdjustment(client, claimId, input),
      /** claimLineId omitted/undefined => claim-level denial; set => line-level. */
      recordDenial: (
        claimId: string,
        input: { code?: string; reason: string; claimLineId?: string | null; createdByUserId?: string },
      ) => insertClaimDenial(client, claimId, input),
      recordStatusEvent: (
        claimId: string,
        fromStatus: DbClaimStatus | null,
        toStatus: DbClaimStatus,
        reason: string,
        changedByUserId?: string,
      ) => insertClaimStatusEvent(client, claimId, fromStatus, toStatus, reason, changedByUserId),
      /** Approves and pays a claim: records the payer payment, logs the status
       * transition (with the [automated]/[manual] marker mapClaim() parses back
       * out — there is no adjudication_method column on the live claims table),
       * then flips status to paid. Replaces the bare status flip a plain
       * `.update({ status })` would have done on its own. */
      async approve(id: string, approvedAmount: number, method: 'automated' | 'manual' = 'manual'): Promise<ClaimRow> {
        const current = await unwrap<ClaimRow>(await client.from('claims').select('*').eq('id', id).single());
        await insertClaimPayment(client, id, {
          source: 'payer',
          method: method === 'automated' ? 'auto_adjudication' : 'manual_adjudication',
          amountCents: dollarsToCents(approvedAmount),
        });
        await insertClaimStatusEvent(client, id, current.status, 'paid', `[${method}] approved and paid $${approvedAmount.toFixed(2)}`);
        return unwrap<ClaimRow>(
          await client
            .from('claims')
            .update({ status: 'paid', paid_at: new Date().toISOString(), reviewed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single(),
        );
      },
      /** Denies a claim with a structured reason: records a claim-level
       * claim_denials row, logs the status transition, then flips status. */
      async deny(id: string, denialCode: string, denialReason: string, method: 'automated' | 'manual' = 'manual'): Promise<ClaimRow> {
        const current = await unwrap<ClaimRow>(await client.from('claims').select('*').eq('id', id).single());
        await insertClaimDenial(client, id, { code: denialCode, reason: denialReason });
        await insertClaimStatusEvent(client, id, current.status, 'denied', `[${method}] denied — ${denialCode}: ${denialReason}`);
        return unwrap<ClaimRow>(
          await client
            .from('claims')
            .update({ status: 'denied', denied_at: new Date().toISOString(), denial_reason: denialReason, reviewed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single(),
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
