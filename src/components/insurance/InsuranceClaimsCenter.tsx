import React, { useEffect, useState } from 'react';
import { sampleClaims } from '../../data/mockData';
import { Claim, DenialCode } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapClaim } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { classifyClaim, getNextStepRecommendation, DENIAL_REASONS } from '../../lib/claimsAutomation';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Sparkles,
  Database,
  FlaskConical,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const DENIAL_CODES = Object.keys(DENIAL_REASONS) as DenialCode[];

/** Local override applied on top of a base claim (demo mode) or refetched after a real write (live mode). */
type ClaimOverride = Pick<Claim, 'status' | 'planCoveredAmount' | 'denialCode' | 'denialReason' | 'adjudicationMethod'>;

export const InsuranceClaimsCenter: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, ClaimOverride>>({});
  const [isAnalyzingFwa, setIsAnalyzingFwa] = useState(false);
  const [fwaResult, setFwaResult] = useState<any>(null);
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);
  const [autoRunSummary, setAutoRunSummary] = useState<string | null>(null);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [denialCode, setDenialCode] = useState<DenialCode>('MISSING_DOCS');
  const [denialReason, setDenialReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const { data: realClaims, loading, error } = useAsync<Claim[]>(
    async () => (await getRepositories().claims.listDetailed()).map(mapClaim),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realClaims && realClaims.length > 0;
  const baseClaims: Claim[] = usingLive ? (realClaims as Claim[]) : sampleClaims;
  const claims: Claim[] = baseClaims.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c));
  const selectedClaim = claims.find((c) => c.id === selectedId) ?? claims[0] ?? null;

  useEffect(() => {
    if (!selectedId || !claims.some((c) => c.id === selectedId)) {
      setSelectedId(claims[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims]);

  useEffect(() => {
    setFwaResult(null);
    setActionError(null);
    if (selectedClaim) {
      setPaymentAmount(selectedClaim.planCoveredAmount.toFixed(2));
      setDenialReason('');
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyOverride(id: string, patch: ClaimOverride) {
    setOverrides((prev) => ({ ...prev, [id]: patch }));
  }

  async function decide(id: string, patch: ClaimOverride) {
    // Optimistic local update so the UI reflects the decision immediately,
    // whether or not a live write follows (demo mode never writes to
    // Supabase — same honesty convention this file already used).
    applyOverride(id, patch);
    if (!usingLive) return;
    try {
      if (patch.status === 'paid') {
        await getRepositories().claims.approve(id, patch.planCoveredAmount, patch.adjudicationMethod);
      } else if (patch.status === 'denied') {
        await getRepositories().claims.deny(
          id,
          patch.denialCode as string,
          patch.denialReason || DENIAL_REASONS[patch.denialCode as DenialCode].label,
          patch.adjudicationMethod,
        );
      }
    } catch (err: any) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      throw err;
    }
  }

  async function handleApprove() {
    if (!selectedClaim) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setActionError('Enter a valid payment amount.');
      return;
    }
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await decide(selectedClaim.id, {
        status: 'paid',
        planCoveredAmount: amount,
        denialCode: null,
        denialReason: null,
        adjudicationMethod: 'manual',
      });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve claim');
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleDeny() {
    if (!selectedClaim) return;
    setIsSubmittingAction(true);
    setActionError(null);
    try {
      await decide(selectedClaim.id, {
        status: 'denied',
        planCoveredAmount: selectedClaim.planCoveredAmount,
        denialCode,
        denialReason: denialReason.trim() || DENIAL_REASONS[denialCode].label,
        adjudicationMethod: 'manual',
      });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to deny claim');
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handleRunAutomation() {
    setIsRunningAutomation(true);
    setAutoRunSummary(null);
    let count = 0;
    for (const claim of claims) {
      const classification = classifyClaim(claim);
      if (classification.recommendedAction !== 'auto_approve') continue;
      await decide(claim.id, {
        status: 'paid',
        planCoveredAmount: claim.planCoveredAmount,
        denialCode: null,
        denialReason: null,
        adjudicationMethod: 'automated',
      });
      count += 1;
    }
    setAutoRunSummary(count === 0 ? 'No claims were eligible for automatic approval.' : `Auto-approved ${count} claim${count === 1 ? '' : 's'}.`);
    setIsRunningAutomation(false);
  }

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

  const needsReviewCount = claims.filter((c) => classifyClaim(c).recommendedAction === 'manual_review').length;
  const autoEligibleCount = claims.filter((c) => classifyClaim(c).recommendedAction === 'auto_approve').length;

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
                : usingLive
                  ? 'Review Supabase claims and persist payer status decisions. EDI clearinghouse ingestion is not configured yet.'
                  : 'Review demo claims and payer adjudication workflow. EDI clearinghouse ingestion is not configured yet.'}
          </p>
        </div>

        <div className="flex gap-3 text-xs items-center">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <span className="text-indigo-200 block text-[10px]">Needs Review</span>
            <span className="font-mono font-bold text-amber-300">{needsReviewCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <span className="text-indigo-200 block text-[10px]">Auto-Eligible</span>
            <span className="font-mono font-bold text-teal-300">{autoEligibleCount}</span>
          </div>
          <button
            onClick={handleRunAutomation}
            disabled={isRunningAutomation || autoEligibleCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-bold text-[11px] transition-colors"
          >
            {isRunningAutomation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Run Automation Now
          </button>
        </div>
      </div>

      {autoRunSummary && (
        <div className="text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 rounded-lg px-3 py-2">
          {autoRunSummary}
        </div>
      )}

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
                <div className="mt-2 flex items-center gap-1.5">
                  {claim.adjudicationMethod === 'automated' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      <Zap className="w-2.5 h-2.5" /> Auto-adjudicated
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {getNextStepRecommendation(claim)}
                  </span>
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

              {/* Automation / next-step insight */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold">Recommended next step: </span>
                {getNextStepRecommendation(selectedClaim)}
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
                    {isAnalyzingFwa ? 'Analyzing claim...' : 'Run AI Fraud Review'}
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

              {actionError && (
                <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {actionError}
                </div>
              )}

              {selectedClaim.status === 'paid' ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Paid ${selectedClaim.planCoveredAmount.toFixed(2)}
                  {selectedClaim.adjudicationMethod === 'automated' ? ' (automated)' : usingLive ? ' (manual)' : ' (demo)'}
                </div>
              ) : selectedClaim.status === 'denied' ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Denied — {selectedClaim.denialCode}</p>
                    <p>{selectedClaim.denialReason}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Approve / payment */}
                  <div className="space-y-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      Payment amount ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleApprove}
                      disabled={isSubmittingAction}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {usingLive ? 'Approve & Pay Claim' : 'Demo Approve & Pay'}
                    </button>
                  </div>

                  {/* Deny */}
                  <div className="space-y-2 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                    <label className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Denial reason</label>
                    <select
                      value={denialCode}
                      onChange={(e) => setDenialCode(e.target.value as DenialCode)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {DENIAL_CODES.map((code) => (
                        <option key={code} value={code}>
                          {DENIAL_REASONS[code].label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                      placeholder="Optional additional notes"
                      rows={1}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      onClick={handleDeny}
                      disabled={isSubmittingAction}
                      className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> {usingLive ? 'Deny Claim' : 'Demo Deny Claim'}
                    </button>
                  </div>
                </div>
              )}

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
