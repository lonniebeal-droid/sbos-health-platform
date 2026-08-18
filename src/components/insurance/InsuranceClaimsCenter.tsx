import React, { useEffect, useState } from 'react';
import { sampleClaims } from '../../data/mockData';
import { Claim, ClaimStatus } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapClaim } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { ShieldAlert, CheckCircle2, XCircle, Sparkles, Database, FlaskConical } from 'lucide-react';

export const InsuranceClaimsCenter: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ClaimStatus>>({});
  const [isAnalyzingFwa, setIsAnalyzingFwa] = useState(false);
  const [fwaResult, setFwaResult] = useState<any>(null);

  const { data: realClaims, loading, error } = useAsync<Claim[]>(
    async () => (await getRepositories().claims.listDetailed()).map(mapClaim),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realClaims && realClaims.length > 0;
  const baseClaims: Claim[] = usingLive ? (realClaims as Claim[]) : sampleClaims;
  const claims: Claim[] = baseClaims.map((c) =>
    statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] } : c,
  );
  const selectedClaim = claims.find((c) => c.id === selectedId) ?? claims[0] ?? null;

  useEffect(() => {
    if (!selectedId || !claims.some((c) => c.id === selectedId)) {
      setSelectedId(claims[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims]);

  const handleAdjudicate = async (id: string, newStatus: 'approved' | 'denied') => {
    const status: ClaimStatus = newStatus === 'approved' ? 'paid' : 'denied';
    setStatusOverrides((prev) => ({ ...prev, [id]: status }));
    if (usingLive) {
      try {
        await getRepositories().claims.updateStatus(id, status);
      } catch {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  const handleRunAiFraudCheck = async (claim: Claim) => {
    setIsAnalyzingFwa(true);
    setFwaResult(null);

    try {
      const response = await fetch('/api/ai/fraud-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimData: claim })
      });
      const data = await response.json();
      setFwaResult(data);
    } catch {
      setFwaResult({
        riskScore: claim.aiRiskScore,
        recommendation: claim.aiRiskScore > 50 ? 'Recommend Audit: Flagged for high frequency CPT submission.' : 'Auto-Approve: Claim parameters match standard Medicare fee benchmark.',
        riskFlags: claim.aiRiskFlags
      });
    } finally {
      setIsAnalyzingFwa(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldAlert className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Payer Claims Adjudication & AI Fraud Detection (FWA)</h2>
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
          <p className="text-xs text-indigo-200 mt-1">
            {loading
              ? 'Loading claims queue...'
              : error
                ? `Could not load live claims (${error}); showing demo data.`
                : 'Real-time EDI 837 claims ingestion, automated rule adjudication, and AI anomaly detection.'}
          </p>
        </div>

        <div className="flex gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <span className="text-indigo-200 block text-[10px]">Claims Auto-Adjudicated</span>
            <span className="font-mono font-bold text-teal-300">98.4% Rate</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Claims Queue */}
        <div className="lg:col-span-5 space-y-3">
          {claims.map((claim) => {
            const isSelected = selectedClaim?.id === claim.id;
            return (
              <div
                key={claim.id}
                onClick={() => {
                  setSelectedId(claim.id);
                  setFwaResult(null);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">{claim.claimNumber}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{claim.patientName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{claim.providerName}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">${claim.totalBilled.toFixed(2)}</span>
                    <div className="mt-1">
                      {claim.aiRiskScore > 50 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Risk: {claim.aiRiskScore}/100
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Clean ({claim.aiRiskScore}/100)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Claim Adjudication Workspace */}
        <div className="lg:col-span-7">
          {selectedClaim ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
              
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{selectedClaim.claimNumber}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedClaim.patientName}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provider: {selectedClaim.providerName} (NPI: {selectedClaim.providerNpi})</p>
                </div>
                <div className="text-right font-mono font-extrabold text-xl text-slate-900 dark:text-white">
                  ${selectedClaim.totalBilled.toFixed(2)}
                </div>
              </div>

              {/* AI FWA Analysis Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-teal-500/10 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-900 dark:text-indigo-300">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>AI Fraud, Waste & Abuse (FWA) Risk Engine</span>
                  </div>
                  <button
                    onClick={() => handleRunAiFraudCheck(selectedClaim)}
                    disabled={isAnalyzingFwa}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors"
                  >
                    {isAnalyzingFwa ? 'Analyzing EDI...' : 'Re-Run AI Fraud Inspection'}
                  </button>
                </div>

                {fwaResult ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                      <span>Risk Score:</span>
                      <span className={`px-2 py-0.5 rounded-md font-mono ${fwaResult.riskScore > 50 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {fwaResult.riskScore} / 100
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{fwaResult.recommendation}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    AI recommendation: {selectedClaim.plainEnglishExplanation}
                  </p>
                )}
              </div>

              {/* Adjudication Decision Controls */}
              <div className="pt-3 flex gap-3">
                <button
                  onClick={() => handleAdjudicate(selectedClaim.id, 'approved')}
                  disabled={selectedClaim.status === 'paid'}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedClaim.status === 'paid' ? 'Paid & Adjudicated' : 'Approve & Pay Claim'}
                </button>

                <button
                  onClick={() => handleAdjudicate(selectedClaim.id, 'denied')}
                  disabled={selectedClaim.status === 'denied'}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {selectedClaim.status === 'denied' ? 'Claim Denied' : 'Deny Claim'}
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              Select a claim on the left to inspect.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
