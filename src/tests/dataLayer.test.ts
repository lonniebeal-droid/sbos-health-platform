import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createRepositories } from '../lib/repositories';
import { createAuthService } from '../lib/services/authService';
import { createOrganizationService } from '../lib/services/organizationService';

// ---- Minimal fake Supabase query builder ----
// Records the chained operations and resolves to a caller-supplied result. The
// builder is thenable, mirroring supabase-js where awaiting the builder runs the
// query. `handler(table, ops)` returns { data, error }.
type Result = { data: unknown; error: { message: string } | null };
function fakeClient(handler: (table: string, ops: unknown[][]) => Result): SupabaseClient {
  const client = {
    from(table: string) {
      const ops: unknown[][] = [];
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'order', 'eq', 'insert', 'update']) {
        builder[m] = (...args: unknown[]) => { ops.push([m, ...args]); return builder; };
      }
      for (const m of ['single', 'maybeSingle']) {
        builder[m] = () => { ops.push([m]); return builder; };
      }
      builder.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(handler(table, ops)).then(resolve, reject);
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

// Same fake query builder, but records every `.from(table)` call (not just the
// last one) — needed for claims.approve()/deny(), which issue several
// sequential calls across the claims/claim_payments/claim_denials/
// claim_status_events tables instead of a single update.
function recordingClient(responder: (table: string, ops: unknown[][]) => Result) {
  const calls: { table: string; ops: unknown[][] }[] = [];
  const client = {
    from(table: string) {
      const ops: unknown[][] = [];
      const builder: Record<string, unknown> = {};
      for (const m of ['select', 'order', 'eq', 'insert', 'update']) {
        builder[m] = (...args: unknown[]) => { ops.push([m, ...args]); return builder; };
      }
      for (const m of ['single', 'maybeSingle']) {
        builder[m] = () => { ops.push([m]); return builder; };
      }
      builder.then = (resolve: (v: Result) => unknown, reject: (e: unknown) => unknown) => {
        calls.push({ table, ops });
        return Promise.resolve(responder(table, ops)).then(resolve, reject);
      };
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('repositories', () => {
  it('organizations.list returns rows ordered by name', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: [{ id: 'o1', name: 'A' }], error: null };
    }));
    const rows = await repos.organizations.list();
    expect(seenTable).toBe('organizations');
    expect(seenOps).toContainEqual(['order', 'name']);
    expect(rows).toHaveLength(1);
  });

  it('unwrap throws the Postgrest error message', async () => {
    const repos = createRepositories(fakeClient(() => ({ data: null, error: { message: 'RLS denied' } })));
    await expect(repos.patients.list()).rejects.toThrow('RLS denied');
  });

  it('organizations.listAsTenantOrgs maps live rows (no type/tax_id/npi columns) to an honest TenantOrg view', async () => {
    const repos = createRepositories(fakeClient(() => ({
      data: [{ id: 'o1', name: 'Bay Area Health System', slug: 'bay-area', created_at: '', updated_at: '' }],
      error: null,
    })));
    const orgs = await repos.organizations.listAsTenantOrgs();
    expect(orgs[0]).toMatchObject({ id: 'o1', name: 'Bay Area Health System', badge: 'Organization', npiOrTaxId: '—' });
  });

  it('users.getByEmail filters by email', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: { id: 'u1', role: 'medical_biller' }, error: null };
    }));
    const row = await repos.users.getByEmail('biller@bayarea.test');
    expect(seenOps).toContainEqual(['eq', 'email', 'biller@bayarea.test']);
    expect(row?.role).toBe('medical_biller');
  });

  it('patients.listDetailed embeds insurance_info instead of joining users (live patients carries name/email/phone directly)', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: [{ id: 'pat-1', full_name: 'Sarah Jenkins', insurance: null }], error: null };
    }));
    const rows = await repos.patients.listDetailed();
    expect(seenTable).toBe('patients');
    expect(seenOps).toContainEqual(['select', '*, insurance:insurance_info(*)']);
    expect(rows[0].full_name).toBe('Sarah Jenkins');
  });

  it('providers.list queries users filtered to role = provider (no live providers table)', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: [{ id: 'u1', full_name: 'Dr. James Wilson', organization_id: 'org-1', is_active: true, created_at: '' }], error: null };
    }));
    const rows = await repos.providers.list();
    expect(seenTable).toBe('users');
    expect(seenOps).toContainEqual(['eq', 'role', 'provider']);
    expect(rows[0].full_name).toBe('Dr. James Wilson');
  });

  // Tenant scoping today is enforced entirely by Supabase RLS on the live
  // project, not by these repositories — none of them add an explicit
  // `.eq('organization_id', ...)` filter, they rely on the authenticated
  // session's row-level policy to scope results. RLS is currently DISABLED
  // on the live "SBOS HealthOS" project (flagged separately), so this
  // repository layer cannot itself guarantee cross-tenant isolation right
  // now — documenting that honestly here instead of asserting it's blocked.
  it('repository queries do not themselves filter by organization_id — isolation depends entirely on RLS', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: [], error: null };
    }));
    await repos.patients.listDetailed();
    expect(seenOps.some((op) => op[0] === 'eq' && op[1] === 'organization_id')).toBe(false);
  });

  it('appointments.updateStatus issues an update + eq filter', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: { id: 'a1', status: 'cancelled' }, error: null };
    }));
    const row = await repos.appointments.updateStatus('a1', 'cancelled');
    expect(seenOps).toContainEqual(['update', { status: 'cancelled' }]);
    expect(seenOps).toContainEqual(['eq', 'id', 'a1']);
    expect(row.status).toBe('cancelled');
  });

  it('claims.approve records a payer claim_payments row, a [manual] claim_status_events row, then flips status to paid', async () => {
    const { client, calls } = recordingClient((table, ops) => {
      if (table === 'claims') {
        const isUpdate = ops.some((op) => op[0] === 'update');
        return isUpdate ? { data: { id: 'clm1', status: 'paid' }, error: null } : { data: { id: 'clm1', status: 'in_review' }, error: null };
      }
      if (table === 'claim_payments') return { data: { id: 'pay1' }, error: null };
      if (table === 'claim_status_events') return { data: { id: 'evt1' }, error: null };
      throw new Error(`unexpected table: ${table}`);
    });
    const row = await createRepositories(client).claims.approve('clm1', 120, 'manual');
    expect(row.status).toBe('paid');

    const paymentOps = calls.find((c) => c.table === 'claim_payments')?.ops ?? [];
    expect(paymentOps).toContainEqual([
      'insert',
      { claim_id: 'clm1', payment_source: 'payer', payment_method: 'manual_adjudication', amount_cents: 12000, reference_number: null, posted_by_user_id: null },
    ]);

    const eventOps = calls.find((c) => c.table === 'claim_status_events')?.ops ?? [];
    const eventInsert = eventOps.find((op) => op[0] === 'insert')?.[1] as Record<string, unknown>;
    expect(eventInsert).toMatchObject({ claim_id: 'clm1', from_status: 'in_review', to_status: 'paid' });
    expect(eventInsert.reason).toContain('[manual]');

    const claimsUpdateOps = calls.filter((c) => c.table === 'claims').flatMap((c) => c.ops);
    expect(claimsUpdateOps).toContainEqual(['update', expect.objectContaining({ status: 'paid' })]);
  });

  it('claims.approve tags the payment/status-event as [automated] and auto_adjudication for the automation engine', async () => {
    const { client, calls } = recordingClient((table, ops) => {
      if (table === 'claims') return { data: { id: 'clm1', status: ops.some((op) => op[0] === 'update') ? 'paid' : 'submitted' }, error: null };
      return { data: { id: 'x' }, error: null };
    });
    await createRepositories(client).claims.approve('clm1', 50, 'automated');
    const paymentOps = calls.find((c) => c.table === 'claim_payments')?.ops ?? [];
    expect(paymentOps).toContainEqual([
      'insert',
      { claim_id: 'clm1', payment_source: 'payer', payment_method: 'auto_adjudication', amount_cents: 5000, reference_number: null, posted_by_user_id: null },
    ]);
    const eventInsert = (calls.find((c) => c.table === 'claim_status_events')?.ops ?? []).find((op) => op[0] === 'insert')?.[1] as Record<string, unknown>;
    expect(eventInsert.reason).toContain('[automated]');
  });

  it('claims.deny records a claim-level claim_denials row (claim_line_id null) and denies the claim', async () => {
    const { client, calls } = recordingClient((table, ops) => {
      if (table === 'claims') return { data: { id: 'clm2', status: ops.some((op) => op[0] === 'update') ? 'denied' : 'in_review' }, error: null };
      if (table === 'claim_denials') return { data: { id: 'den1' }, error: null };
      if (table === 'claim_status_events') return { data: { id: 'evt2' }, error: null };
      throw new Error(`unexpected table: ${table}`);
    });
    const row = await createRepositories(client).claims.deny('clm2', 'MISSING_DOCS', 'Chart notes not received', 'automated');
    expect(row.status).toBe('denied');

    const denialOps = calls.find((c) => c.table === 'claim_denials')?.ops ?? [];
    expect(denialOps).toContainEqual([
      'insert',
      { claim_id: 'clm2', claim_line_id: null, denial_code: 'MISSING_DOCS', denial_reason: 'Chart notes not received', created_by_user_id: null },
    ]);

    const claimsUpdateOps = calls.filter((c) => c.table === 'claims').flatMap((c) => c.ops);
    expect(claimsUpdateOps).toContainEqual([
      'update',
      expect.objectContaining({ status: 'denied', denial_reason: 'Chart notes not received' }),
    ]);
  });

  it('claims.recordPayment/recordAdjustment/recordDenial write to their own child tables', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: { id: 'row1' }, error: null };
    }));

    await repos.claims.recordPayment('clm3', { source: 'patient', method: 'card', amountCents: 2500 });
    expect(seenTable).toBe('claim_payments');
    expect(seenOps).toContainEqual(['insert', { claim_id: 'clm3', payment_source: 'patient', payment_method: 'card', amount_cents: 2500, reference_number: null, posted_by_user_id: null }]);

    await repos.claims.recordAdjustment('clm3', { type: 'contractual', amountCents: 1500, reason: 'In-network write-off' });
    expect(seenTable).toBe('claim_adjustments');
    expect(seenOps).toContainEqual(['insert', { claim_id: 'clm3', adjustment_type: 'contractual', amount_cents: 1500, reason: 'In-network write-off', created_by_user_id: null }]);

    await repos.claims.recordDenial('clm3', { code: 'CODING_ERROR', reason: 'Mismatched CPT/ICD-10', claimLineId: 'line-9' });
    expect(seenTable).toBe('claim_denials');
    expect(seenOps).toContainEqual(['insert', { claim_id: 'clm3', claim_line_id: 'line-9', denial_code: 'CODING_ERROR', denial_reason: 'Mismatched CPT/ICD-10', created_by_user_id: null }]);
  });

  it('prescriptions.requestRefill sets refill_requested status', async () => {
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((_t, ops) => {
      seenOps = ops;
      return { data: { id: 'rx1', status: 'refill_requested' }, error: null };
    }));
    await repos.prescriptions.requestRefill('rx1');
    expect(seenOps).toContainEqual(['update', { status: 'refill_requested' }]);
  });

  it('priorAuths.create inserts a new prior authorization row', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const payload = {
      patient_id: 'patient-1',
      provider_id: 'provider-1',
      organization_id: 'org-1',
      requested_service: 'MRI Brain',
      icd10_code: 'G44.209',
      cpt_code: '70553',
      status: 'pending' as const,
      clinical_notes: 'Medical necessity summary',
      ai_recommendation: 'Review recommended',
    };
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: { id: 'pa1', created_at: '2026-08-18T00:00:00Z', ...payload }, error: null };
    }));

    const row = await repos.priorAuths.create(payload);

    expect(seenTable).toBe('prior_authorizations');
    expect(seenOps).toContainEqual(['insert', payload]);
    expect(seenOps).toContainEqual(['select']);
    expect(seenOps).toContainEqual(['single']);
    expect(row.id).toBe('pa1');
  });

  it('priorAuths.updateStatus persists adjudication decisions', async () => {
    let seenTable = '';
    let seenOps: unknown[][] = [];
    const repos = createRepositories(fakeClient((table, ops) => {
      seenTable = table; seenOps = ops;
      return { data: { id: 'pa1', status: 'approved' }, error: null };
    }));

    const row = await repos.priorAuths.updateStatus('pa1', 'approved');

    expect(seenTable).toBe('prior_authorizations');
    expect(seenOps).toContainEqual(['update', { status: 'approved' }]);
    expect(seenOps).toContainEqual(['eq', 'id', 'pa1']);
    expect(seenOps).toContainEqual(['select']);
    expect(seenOps).toContainEqual(['single']);
    expect(row.status).toBe('approved');
  });
});

describe('organizationService', () => {
  it('maps rows to TenantOrg view', async () => {
    const svc = createOrganizationService(fakeClient(() => ({
      data: [{ id: 'o1', name: 'Bay Area', type: 'health_system', tax_id: null, npi: '123', created_at: '', updated_at: '' }],
      error: null,
    })));
    const orgs = await svc.listOrganizations();
    expect(orgs[0]).toMatchObject({ id: 'o1', name: 'Bay Area', npiOrTaxId: 'NPI: 123' });
  });
});

describe('authService', () => {
  function authClient(overrides: Record<string, unknown>): SupabaseClient {
    return { auth: overrides } as unknown as SupabaseClient;
  }

  it('signIn returns user + session on success', async () => {
    const svc = createAuthService(authClient({
      signInWithPassword: async () => ({
        data: { user: { id: 'u1' }, session: { access_token: 't' } }, error: null,
      }),
    }));
    const res = await svc.signIn('a@b.com', 'pw');
    expect(res.user.id).toBe('u1');
    expect(res.session.access_token).toBe('t');
  });

  it('signIn throws the provider error message', async () => {
    const svc = createAuthService(authClient({
      signInWithPassword: async () => ({ data: {}, error: { message: 'Invalid login credentials' } }),
    }));
    await expect(svc.signIn('a@b.com', 'bad')).rejects.toThrow('Invalid login credentials');
  });

  it('getAuthUser returns null when there is no session', async () => {
    const svc = createAuthService(authClient({
      getUser: async () => ({ data: { user: null }, error: { message: 'no session' } }),
    }));
    expect(await svc.getAuthUser()).toBeNull();
  });
});
