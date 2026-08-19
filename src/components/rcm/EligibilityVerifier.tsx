import React, { useEffect, useState } from 'react';
import { sampleBenefitsPlan, samplePatient } from '../../data/mockData';
import { BenefitsPlan, Patient } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapBenefitsPlan, mapPatient } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { ShieldCheck, Search, CheckCircle2, RefreshCw, FlaskConical, Database } from 'lucide-react';

interface EligibilityResult {
  status: 'ACTIVE_ELIGIBLE';
  planName: string;
  subscriberName: string;
  effectiveDate: string;
  deductibleTotal: number;
  deductibleRemaining: number;
  outOfPocketMax: number;
  copayPrimaryCare: number;
  copaySpecialist: number;
  copayTelehealth: number;
  coInsurancePercent: number;
  source: 'live_plan' | 'demo_plan';
}

function buildEligibilityResult(patient: Patient, plan: BenefitsPlan, source: EligibilityResult['source']): EligibilityResult {
  return {
    status: 'ACTIVE_ELIGIBLE',
    planName: plan.planName,
    subscriberName: patient.name,
    effectiveDate: '2026-01-01',
    deductibleTotal: plan.individualDeductible,
    deductibleRemaining: Math.max(0, plan.individualDeductible - plan.deductibleMet),
    outOfPocketMax: plan.outOfPocketMax,
    copayPrimaryCare: plan.copays.primaryCare,
    copaySpecialist: plan.copays.specialist,
    copayTelehealth: plan.copays.primaryCare,
    coInsurancePercent: 10,
    source,
  };
}

export const EligibilityVerifier: React.FC = () => {
  const { data: realPatients, loading: patientsLoading, error: patientsError } = useAsync<Patient[]>(
    async () => (await getRepositories().patients.listDetailed()).map(mapPatient),
    isSupabaseConfigured,
  );
  const { data: realPlans, loading: plansLoading, error: plansError } = useAsync<BenefitsPlan[]>(
    async () => (await getRepositories().benefitsPlans.list()).map(mapBenefitsPlan),
    isSupabaseConfigured,
  );
  const usingLivePatient = isSupabaseConfigured && !!realPatients && realPatients.length > 0;
  const usingLivePlan = isSupabaseConfigured && !!realPlans && realPlans.length > 0;
  const activePatient = usingLivePatient ? realPatients[0] : samplePatient;
  const activePlan = usingLivePlan ? realPlans[0] : sampleBenefitsPlan;
  const dataSource: EligibilityResult['source'] = usingLivePlan ? 'live_plan' : 'demo_plan';
  const [memberId, setMemberId] = useState(samplePatient.insuranceId);
  const [payerName, setPayerName] = useState('SBOS Gold Premier PPO (Payer ID #94882)');
  const [serviceType, setServiceType] = useState('30 (Health Benefit Plan Coverage)');
  const [isVerifying, setIsVerifying] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const displayedEligibility = eligibilityResult ?? buildEligibilityResult(activePatient, activePlan, dataSource);
  const loading = patientsLoading || plansLoading;
  const error = patientsError || plansError;

  useEffect(() => {
    if (usingLivePatient && memberId === samplePatient.insuranceId) {
      setMemberId(activePatient.insuranceId);
    }
    if (usingLivePlan && payerName === 'SBOS Gold Premier PPO (Payer ID #94882)') {
      setPayerName(`${activePlan.planName} (${activePlan.planId})`);
    }
  }, [activePatient.insuranceId, activePlan.planId, activePlan.planName, memberId, payerName, usingLivePatient, usingLivePlan]);

  const handleCheckEligibility = async () => {
    setIsVerifying(true);
    setTimeout(() => {
      setEligibilityResult(buildEligibilityResult(activePatient, activePlan, dataSource));
      setIsVerifying(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Eligibility & Copay Verifier</h2>
            <span
              title={usingLivePlan ? 'Member benefits loaded from Supabase; clearinghouse 270/271 submission is still demo-only' : 'Demo workflow — no clearinghouse connection is configured in this app yet'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLivePlan
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLivePlan ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLivePlan ? 'Live benefits data' : 'Demo eligibility'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading member and benefits plan data...'
              : error
                ? `Could not load live eligibility inputs (${error}); showing demo data.`
                : usingLivePlan
                  ? 'Generate a 271-style coverage preview from the connected benefits plan. A real clearinghouse connection is still required before live 270/271 benefit checks.'
                  : 'Demo eligibility workflow. A real clearinghouse connection is still required before live 270/271 benefit checks.'}
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          EDI 270 Insurance Coverage Inquiry
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-500 block mb-1">Member Insurance ID</label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div>
            <label className="font-bold text-slate-500 block mb-1">Payer Clearinghouse ID</label>
            <input
              type="text"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="font-bold text-slate-500 block mb-1">Service Type Code</label>
            <input
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleCheckEligibility}
          disabled={isVerifying}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 transition-all"
        >
          {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin text-teal-300" /> : <ShieldCheck className="w-4 h-4" />}
          {isVerifying ? 'Generating 271-Style Preview...' : usingLivePlan ? 'Generate 271-Style Preview From Live Plan' : 'Run Demo Eligibility Check'}
        </button>

        {displayedEligibility && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  {displayedEligibility.source === 'live_plan' ? 'Live-plan 271-style preview' : 'Demo 271-style response generated'}
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{displayedEligibility.planName}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{displayedEligibility.subscriberName}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> {displayedEligibility.source === 'live_plan' ? 'ACTIVE COVERAGE PREVIEW' : 'DEMO ACTIVE COVERAGE'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Remaining Deductible</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">${displayedEligibility.deductibleRemaining}</span>
                <span className="text-[9px] text-slate-400 block font-sans">of ${displayedEligibility.deductibleTotal} Total</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Primary Care Copay</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">${displayedEligibility.copayPrimaryCare}</span>
                <span className="text-[9px] text-slate-400 block font-sans">Fixed Copayment</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Specialist Copay</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">${displayedEligibility.copaySpecialist}</span>
                <span className="text-[9px] text-slate-400 block font-sans">Fixed Copayment</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Telehealth Copay</span>
                <span className="font-extrabold text-teal-600 dark:text-teal-400 text-base">${displayedEligibility.copayTelehealth}</span>
                <span className="text-[9px] text-teal-500 block font-sans">In-Network Preferred</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
