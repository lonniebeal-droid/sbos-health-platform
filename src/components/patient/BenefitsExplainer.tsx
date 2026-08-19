import React, { useState } from 'react';
import { sampleBenefitsPlan } from '../../data/mockData';
import { BenefitsPlan } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapBenefitsPlan } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { Shield, Sparkles, Search, CheckCircle2, HelpCircle, ArrowRight, DollarSign, Activity, Percent } from 'lucide-react';

export const BenefitsExplainer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load the member's real benefits plan (RLS-scoped); fall back to demo data.
  const { data: realPlans } = useAsync<BenefitsPlan[]>(
    async () => (await getRepositories().benefitsPlans.list()).map(mapBenefitsPlan),
    isSupabaseConfigured,
  );
  const plan: BenefitsPlan =
    isSupabaseConfigured && realPlans && realPlans.length > 0 ? realPlans[0] : sampleBenefitsPlan;
  const usingLivePlan = isSupabaseConfigured && Boolean(realPlans?.length);

  const sampleCoverageList = [
    { service: 'Primary Care Visit', covered: true, details: '$20 copay per visit (In-Network)', category: 'Doctor Visits' },
    { service: 'Specialist Visit', covered: true, details: '$45 copay per visit (In-Network)', category: 'Doctor Visits' },
    { service: 'Telehealth Consultation', covered: true, details: '$20 copay, 100% covered after deductible', category: 'Telehealth' },
    { service: 'Mental Health Psychotherapy', covered: true, details: '$20 copay for 60-min session', category: 'Behavioral Health' },
    { service: 'Emergency Room', covered: true, details: '$250 copay waived if admitted', category: 'Emergency' },
    { service: 'Generic Prescriptions', covered: true, details: '$10 copay Tier 1 Rx', category: 'Pharmacy' },
    { service: 'Acupuncture & Chiropractic', covered: true, details: 'Up to 20 visits/year covered at $30 copay', category: 'Specialty Care' },
    { service: 'MRI & CT Advanced Imaging', covered: true, details: 'Subject to 10% coinsurance after deductible', category: 'Imaging' },
  ];

  const filteredServices = sampleCoverageList.filter((s) =>
    s.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAskAI = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Using the member's ${plan.planName} benefits summary, answer this coverage question cautiously: "${query}". Explain known copays, deductible status, and prior authorization considerations in simple English. If exact service-level coverage rules are not available, say a benefits representative should verify before care is scheduled.`,
          context: 'general_patient'
        })
      });
      const data = await response.json();
      setAiAnswer(data.reply);
    } catch {
      setAiAnswer(`Demo guidance for ${plan.planName}: "${query}" may depend on network status, medical necessity, deductible progress, and prior authorization rules. Verify the exact benefit before scheduling care.`);
    } finally {
      setIsSearching(false);
    }
  };

  const deductiblePercent = Math.min(100, Math.round((plan.deductibleMet / plan.individualDeductible) * 100));
  const oopPercent = Math.min(100, Math.round((plan.outOfPocketMet / plan.outOfPocketMax) * 100));

  return (
    <div className="space-y-6">
      
      {/* Top Benefits Hero */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-900 via-indigo-900 to-blue-900 text-white shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
              {usingLivePlan ? 'ACTIVE POLICY' : 'DEMO POLICY'}: {plan.planId}
            </span>
            <h2 className="text-2xl font-extrabold mt-2">{plan.planName}</h2>
            <p className="text-xs text-teal-100 mt-1">
              {usingLivePlan
                ? 'Member plan summary loaded from the connected database.'
                : 'Demo medical, mental health, prescription, and emergency coverage summary.'}
            </p>
          </div>

          <button
            onClick={() => handleAskAI('What is my out-of-pocket maximum and deductible status?')}
            className="px-4 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-2 transition-transform active:scale-95 self-start md:self-auto"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            Ask Jessie Benefits AI
          </button>
        </div>

        {/* Deductible & Out-of-Pocket Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          
          {/* Deductible Box */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">Individual Deductible</span>
              <span className="font-mono font-bold text-teal-300">
                ${plan.deductibleMet} / ${plan.individualDeductible}
              </span>
            </div>
            <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${deductiblePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-teal-200 text-right font-medium">
              ${plan.individualDeductible - plan.deductibleMet} remaining until 100% coverage
            </p>
          </div>

          {/* OOP Max Box */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-200">Out-of-Pocket Maximum</span>
              <span className="font-mono font-bold text-blue-300">
                ${plan.outOfPocketMet} / ${plan.outOfPocketMax}
              </span>
            </div>
            <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden p-0.5">
              <div
                className="bg-gradient-to-r from-blue-400 to-indigo-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${oopPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-blue-200 text-right font-medium">
              Protected against major health expenses
            </p>
          </div>

        </div>
      </div>

      {/* Search & AI Explainer Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-500" />
          Coverage & Benefits Explainer in Plain English
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search procedure or question (e.g., 'Is MRI covered?', 'Acupuncture', 'Physical Therapy')..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={() => handleAskAI(searchQuery || 'General Coverage Rules')}
            disabled={isSearching}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            {isSearching ? 'Analyzing...' : 'Ask AI'}
          </button>
        </div>

        {/* AI Answer Box */}
        {aiAnswer && (
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <span>AI Benefits Explanation:</span>
            </div>
            <p className="leading-relaxed">{aiAnswer}</p>
          </div>
        )}
      </div>

      {/* Coverage Grid */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Demo Coverage Examples
        </h3>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Examples only; not a guarantee of benefits.
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredServices.map((item, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.service}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">{item.details}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
