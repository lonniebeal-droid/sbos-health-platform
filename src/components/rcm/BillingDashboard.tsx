import React from 'react';
import { Claim } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapClaim } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { sampleClaims } from '../../data/mockData';
import { DollarSign, TrendingUp, AlertTriangle, Clock, CheckCircle2, FileText } from 'lucide-react';

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Revenue-cycle billing dashboard: aggregates the payer's claims (RLS-scoped) into
// billed / paid / denied / in-review / AR, plus a per-status breakdown.
export const BillingDashboard: React.FC = () => {
  const { data: liveClaims, loading } = useAsync<Claim[]>(
    async () => (await getRepositories().claims.listDetailed()).map(mapClaim),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!liveClaims && liveClaims.length > 0;
  const claims: Claim[] = usingLive ? (liveClaims as Claim[]) : sampleClaims;

  const totalBilled = claims.reduce((s, c) => s + c.totalBilled, 0);
  const totalPaid = claims.reduce((s, c) => s + (c.paidAmount ?? 0), 0);
  const denied = claims.filter((c) => c.status === 'denied');
  const inReview = claims.filter((c) => c.status === 'in_review' || c.status === 'submitted');
  const deniedBilled = denied.reduce((s, c) => s + c.totalBilled, 0);
  // Accounts receivable: billed minus paid on claims that aren't denied.
  const ar = claims
    .filter((c) => c.status !== 'denied')
    .reduce((s, c) => s + Math.max(0, c.totalBilled - (c.paidAmount ?? 0)), 0);

  const byStatus = ['submitted', 'in_review', 'adjudicated', 'approved', 'paid', 'denied'].map((status) => ({
    status,
    count: claims.filter((c) => c.status === status).length,
    billed: claims.filter((c) => c.status === status).reduce((s, c) => s + c.totalBilled, 0),
  }));

  const stat = (label: string, value: string, sub: string, Icon: React.ElementType, tone: string) => (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
      <div className={`flex justify-between items-center ${tone}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">{value}</p>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Revenue Cycle & Billing Dashboard</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            {loading ? 'Loading claims…' : `${claims.length} claims across the payer book of business.`}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usingLive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'}`}>
          {usingLive ? 'Live data' : 'Demo data'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stat('Total Billed', money(totalBilled), `${claims.length} claims`, FileText, 'text-blue-600 dark:text-blue-400')}
        {stat('Total Paid', money(totalPaid), 'Payments posted', CheckCircle2, 'text-emerald-600 dark:text-emerald-400')}
        {stat('Accounts Receivable', money(ar), 'Outstanding (non-denied)', DollarSign, 'text-amber-600 dark:text-amber-400')}
        {stat('Denied', money(deniedBilled), `${denied.length} claims`, AlertTriangle, 'text-rose-600 dark:text-rose-400')}
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-indigo-500" /> Claims by Lifecycle Status
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                <th className="pb-2">Status</th>
                <th className="pb-2">Claims</th>
                <th className="pb-2">Billed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {byStatus.map((r) => (
                <tr key={r.status}>
                  <td className="py-2.5 font-semibold capitalize text-slate-900 dark:text-white">{r.status.replace('_', ' ')}</td>
                  <td className="py-2.5">{r.count}</td>
                  <td className="py-2.5 font-mono">{money(r.billed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">In review / submitted: {inReview.length} claim(s) awaiting adjudication.</p>
      </div>
    </div>
  );
};
