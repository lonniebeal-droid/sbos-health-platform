import React, { useState } from 'react';
import { samplePatient } from '../../data/mockData';
import { ShieldCheck, Search, CheckCircle2, RefreshCw, FlaskConical } from 'lucide-react';

export const EligibilityVerifier: React.FC = () => {
  const [memberId, setMemberId] = useState(samplePatient.insuranceId);
  const [payerName, setPayerName] = useState('SBOS Gold Premier PPO (Payer ID #94882)');
  const [serviceType, setServiceType] = useState('30 (Health Benefit Plan Coverage)');
  const [isVerifying, setIsVerifying] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any>({
    status: 'ACTIVE_ELIGIBLE',
    planName: 'SBOS Gold Premier PPO',
    subscriberName: samplePatient.name,
    effectiveDate: '2026-01-01',
    deductibleTotal: 500.00,
    deductibleRemaining: 150.00,
    outOfPocketMax: 3000.00,
    copayPrimaryCare: 20.00,
    copaySpecialist: 40.00,
    copayTelehealth: 20.00,
    coInsurancePercent: 10
  });

  const handleCheckEligibility = async () => {
    setIsVerifying(true);
    setTimeout(() => {
      setEligibilityResult({
        status: 'ACTIVE_ELIGIBLE',
        planName: 'SBOS Gold Premier PPO',
        subscriberName: samplePatient.name,
        effectiveDate: '2026-01-01',
        deductibleTotal: 500.00,
        deductibleRemaining: 150.00,
        outOfPocketMax: 3000.00,
        copayPrimaryCare: 20.00,
        copaySpecialist: 40.00,
        copayTelehealth: 20.00,
        coInsurancePercent: 10
      });
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
            <h2 className="font-bold text-lg">Real-Time EDI 270/271 Eligibility & Copay Verifier</h2>
            <span
              title="Demo workflow — no clearinghouse connection is configured in this app yet"
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100 border border-amber-400/30"
            >
              <FlaskConical className="w-3 h-3" />
              Demo eligibility
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Demo eligibility workflow. A real clearinghouse connection is still required before live 270/271 benefit checks.
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
          {isVerifying ? 'Running Demo Eligibility Check...' : 'Run Demo Eligibility Check'}
        </button>

        {eligibilityResult && (
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Demo 271-Style Response Generated
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{eligibilityResult.planName}</h4>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ACTIVE COVERAGE
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Remaining Deductible</span>
                <span className="font-extrabold text-slate-900 dark:text-white text-base">${eligibilityResult.deductibleRemaining}</span>
                <span className="text-[9px] text-slate-400 block font-sans">of ${eligibilityResult.deductibleTotal} Total</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Primary Care Copay</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">${eligibilityResult.copayPrimaryCare}</span>
                <span className="text-[9px] text-slate-400 block font-sans">Fixed Copayment</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Specialist Copay</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400 text-base">${eligibilityResult.copaySpecialist}</span>
                <span className="text-[9px] text-slate-400 block font-sans">Fixed Copayment</span>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-sans">Telehealth Copay</span>
                <span className="font-extrabold text-teal-600 dark:text-teal-400 text-base">${eligibilityResult.copayTelehealth}</span>
                <span className="text-[9px] text-teal-500 block font-sans">In-Network Preferred</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
