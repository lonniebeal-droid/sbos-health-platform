import React, { useEffect, useState } from 'react';
import { sampleClaims } from '../../data/mockData';
import { Claim } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapClaim } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { FileText, CheckCircle2, Clock, Sparkles, Calendar, Database, FlaskConical } from 'lucide-react';

export const ClaimsTracker: React.FC = () => {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const { data: realClaims, loading, error } = useAsync<Claim[]>(
    async () => (await getRepositories().claims.listDetailed()).map(mapClaim),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realClaims && realClaims.length > 0;
  const claims: Claim[] = usingLive ? (realClaims as Claim[]) : sampleClaims;

  const filteredClaims = claims.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  useEffect(() => {
    if (!selectedClaim || !claims.some((c) => c.id === selectedClaim.id)) {
      setSelectedClaim(claims[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
      case 'in_review':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1"><Clock className="w-3 h-3" /> In Review</span>;
      case 'adjudicated':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Adjudicated</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileText className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Insurance Claims & Explanation of Benefits (EOB)</h2>
            <span
              title={usingLive ? 'Loaded from Supabase' : 'Demo data fallback'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLive
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLive ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLive ? 'Live data' : 'Demo data'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading claims...'
              : error
                ? `Could not load live claims (${error}); showing demo data.`
                : 'Track claims submitted by your healthcare providers with AI-powered plain English breakdowns.'}
          </p>
        </div>

        <div className="flex gap-2">
          {['all', 'paid', 'in_review', 'adjudicated'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-teal-400 text-slate-950 shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Claims List */}
        <div className="lg:col-span-6 space-y-3">
          {filteredClaims.map((claim) => {
            const isSelected = selectedClaim?.id === claim.id;
            return (
              <div
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-400 block">{claim.claimNumber}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{claim.providerName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Date of Service: {claim.serviceDate}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(claim.status)}
                    <p className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                      ${claim.totalBilled.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-600 dark:text-slate-400">
                    Plan Covered: <span className="font-bold text-emerald-600 dark:text-emerald-400">${claim.planCoveredAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    You Owe: <span className="font-bold text-slate-900 dark:text-white">${claim.patientResponsibility.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* EOB Detailed View */}
        <div className="lg:col-span-6">
          {selectedClaim ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{selectedClaim.claimNumber}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedClaim.providerName}</h3>
                </div>
                {getStatusBadge(selectedClaim.status)}
              </div>

              {/* Plain English AI Explainer Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-indigo-500/10 border border-teal-500/30 dark:border-teal-500/20 space-y-2">
                <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <span>AI Explanation in Plain English</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedClaim.plainEnglishExplanation}
                </p>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Breakdown</h4>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Total Provider Charge Billed</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">${selectedClaim.totalBilled.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>In-Network Discount Adjustment</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">-${(selectedClaim.totalBilled - selectedClaim.planCoveredAmount - selectedClaim.patientResponsibility).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Paid by SBOS Insurance Plan</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">${selectedClaim.planCoveredAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                    <span>Your Total Copay / Out-of-Pocket</span>
                    <span className="font-mono text-teal-600 dark:text-teal-400">${selectedClaim.patientResponsibility.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Medical Codes */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Diagnosis (ICD-10)</p>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedClaim.diagnosisCodes.join(', ')}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Procedure (CPT)</p>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedClaim.procedureCodes.join(', ')}
                  </p>
                </div>
              </div>

              {/* Download EOB Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => alert(`Demo EOB export for Claim ${selectedClaim.claimNumber}. PDF generation is not configured yet.`)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Demo EOB Export
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              Select a claim on the left to inspect detailed EOB.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
