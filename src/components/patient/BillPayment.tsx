import React, { useState } from 'react';
import { DollarSign, CreditCard, CheckCircle2, FlaskConical, Database, Loader2 } from 'lucide-react';
import { sampleClaims } from '../../data/mockData';
import { Claim } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapClaim } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { useAuth } from '../../lib/authContext';
import { dollarsToCents } from '../../lib/claimsBalance';

interface BillRow {
  /** The claims-row UUID used when posting a payment against this bill. */
  claimId: string;
  id: string;
  description: string;
  serviceDate: string;
  dueDate: string;
  amountDue: number;
  status: 'unpaid' | 'paid';
  source: 'live_claim' | 'demo';
}

function claimToBill(claim: Claim, source: BillRow['source']): BillRow {
  const dueDate = new Date(`${claim.serviceDate}T00:00:00`);
  dueDate.setDate(dueDate.getDate() + 30);
  // patientResponsibility is derived from the payment/adjustment ledger
  // (charge − payer payments − adjustments − patient payments), so it already
  // reflects any payments the patient has made — unlike claim.status, which
  // only tracks the payer-side adjudication state.
  const amountDue = Math.max(claim.patientResponsibility, 0);
  return {
    claimId: claim.id,
    id: claim.claimNumber || claim.id,
    description: `${claim.providerName} — ${claim.procedureCodes.join(', ') || 'Medical service'}`,
    serviceDate: claim.serviceDate,
    dueDate: dueDate.toISOString().slice(0, 10),
    amountDue,
    status: amountDue === 0 ? 'paid' : 'unpaid',
    source,
  };
}

export const BillPayment: React.FC = () => {
  const auth = useAuth();
  // Bump to re-read claims after a successful payment posts.
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: realClaims, loading, error } = useAsync<Claim[]>(
    async () => (await getRepositories().claims.listDetailed()).map(mapClaim),
    isSupabaseConfigured,
    [refreshKey],
  );
  const usingLive = isSupabaseConfigured && !!realClaims && realClaims.length > 0;
  const sourceBills = (usingLive ? realClaims : sampleClaims).map((claim) =>
    claimToBill(claim, usingLive ? 'live_claim' : 'demo'),
  );

  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paidOverrides, setPaidOverrides] = useState<Record<string, true>>({});

  const handlePay = async (bill: BillRow) => {
    setPaymentError(null);
    // Demo mode (no Supabase): local confirmation only, clearly labeled.
    if (!usingLive || !auth.session?.user) {
      setPaidOverrides((prev) => ({ ...prev, [bill.id]: true }));
      setPaymentSuccess(bill.id);
      setTimeout(() => setPaymentSuccess(null), 3000);
      return;
    }
    setPayingId(bill.claimId);
    try {
      // Real internal-ledger payment: inserts a claim_payments row attributed
      // to the signed-in patient (RLS restricts this to their own claims).
      await getRepositories().claims.recordPayment(bill.claimId, {
        source: 'patient',
        method: 'card',
        amountCents: dollarsToCents(bill.amountDue),
        postedByUserId: auth.session.user.id,
      });
      setRefreshKey((k) => k + 1);
      setPaymentSuccess(bill.id);
      setTimeout(() => setPaymentSuccess(null), 3000);
    } catch (e) {
      setPaymentError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const bills = sourceBills.map((bill) =>
    paidOverrides[bill.id] ? { ...bill, status: 'paid' as const, amountDue: 0 } : bill,
  );
  const totalOutstanding = bills.reduce((acc, b) => acc + (b.status === 'unpaid' ? b.amountDue : 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Billing, Claims Balance & Payment Workflow</h2>
            <span
              title={usingLive ? 'Balances derive from the live Supabase claims ledger; payments post to your account in real time' : 'Demo workflow — no live payment processor or invoice ledger is configured yet'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-2 ${
                usingLive
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border-amber-400/30'
              }`}
            >
              {usingLive ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLive ? 'Live claims' : 'Demo billing'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading claim balances...'
              : error
                ? `Could not load live claim balances (${error}); showing demo billing.`
                : usingLive
                  ? 'Payments post directly to your claim ledger. External card processing, HSA/FSA, and emailed receipts are not configured yet.'
                  : 'Review sample copays and payment states. Live HSA/FSA processing and receipt generation are not configured yet.'}
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right">
          <span className="text-[10px] text-teal-200 uppercase font-bold block">Total Amount Due</span>
          <span className="font-mono font-extrabold text-xl text-teal-300">${totalOutstanding.toFixed(2)}</span>
        </div>
      </div>

      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300">
          Payment failed: {paymentError}
        </div>
      )}

      {/* Invoice List */}
      <div className="space-y-4">
        {bills.map((bill) => (
          <div
            key={bill.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-slate-400">{bill.id}</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{bill.description}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>Date of Service: {bill.serviceDate}</span>
                  <span>•</span>
                  <span>Due Date: {bill.dueDate}</span>
                  <span>•</span>
                  <span>{bill.source === 'live_claim' ? 'Live claim balance' : 'Demo balance'}</span>
                </p>
              </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
                <p className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                  ${bill.amountDue.toFixed(2)}
                </p>
              </div>

              {bill.status === 'paid' || paymentSuccess === bill.id ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Paid
                </div>
              ) : (
                <button
                  onClick={() => handlePay(bill)}
                  disabled={payingId !== null}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {payingId === bill.claimId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {usingLive ? `Pay $${bill.amountDue.toFixed(2)}` : 'Demo Pay'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
