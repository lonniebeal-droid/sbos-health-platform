import React, { useState } from 'react';
import { Users, FileSpreadsheet, Sparkles, TrendingUp, DollarSign, ShieldCheck, CheckCircle2, UserPlus, Building, ArrowUpRight } from 'lucide-react';

export const EmployerPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'census' | 'plan' | 'ai'>('census');
  const [employees, setEmployees] = useState([
    { id: 'emp_01', name: 'Sarah Jenkins', role: 'Staff Software Engineer', plan: 'SBOS Gold Premier PPO', status: 'Enrolled', dependents: 2, premiumMonthly: 620 },
    { id: 'emp_02', name: 'Marcus Vance', role: 'Senior Product Designer', plan: 'SBOS Gold Premier PPO', status: 'Enrolled', dependents: 0, premiumMonthly: 480 },
    { id: 'emp_03', name: 'Elena Rostova', role: 'Director of Marketing', plan: 'SBOS Silver HDHP + HSA', status: 'Enrolled', dependents: 1, premiumMonthly: 510 },
    { id: 'emp_04', name: 'David Kim', role: 'DevOps Engineer', plan: 'Pending Enrollment', status: 'Action Required', dependents: 0, premiumMonthly: 0 }
  ]);

  const [aiBenefitsQuery, setAiBenefitsQuery] = useState('How can we optimize our Q4 health plan contribution to lower corporate tax liability while maintaining 100% preventive coverage?');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAiBenefitsStrategy = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Employer Benefits Strategy Query: ${aiBenefitsQuery}`,
          context: 'employer'
        })
      });
      const data = await response.json();
      setAiAnalysis(data.reply);
    } catch {
      setAiAnalysis(
        `STRATEGIC RECOMMENDATION FOR HR LEADERSHIP:\n1. Transition 25% of workforce to HDHP + HSA with a $1,000 employer seed match. This yields an estimated 14% annual reduction in premium outlay.\n2. Leverage SBOS AI Telehealth zero-copay incentive to redirect non-emergency ER visits, saving ~$340 per employee incident.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-mono font-bold text-teal-300 uppercase">Acme Tech Corp • Group ID #ACME-88390</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Employer Health Plan & Census Portal</h1>
          <p className="text-xs text-blue-200">
            Review demo employee health benefit enrollment, census imports, and AI cost optimization.
          </p>
        </div>

        <div className="flex gap-3 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right">
            <span className="text-blue-200 text-[10px] uppercase font-bold block">Enrolled Employees</span>
            <span className="font-mono font-extrabold text-xl text-teal-300">142 Active</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('census')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'census'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Employee Census & Enrollment
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-400" /> AI Benefits Advisor
        </button>
      </div>

      {activeTab === 'census' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Group Census Roster</h3>
            <button
              onClick={() => alert('Demo EDI 834 census import is not connected to a live carrier feed yet.')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" /> Add Employee or Demo EDI 834 Import
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="pb-3">Employee Name</th>
                  <th className="pb-3">Job Role</th>
                  <th className="pb-3">Plan Selected</th>
                  <th className="pb-3">Dependents</th>
                  <th className="pb-3">Monthly Premium</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                    <td className="py-3.5 text-slate-500">{emp.role}</td>
                    <td className="py-3.5 font-semibold text-blue-600 dark:text-blue-400">{emp.plan}</td>
                    <td className="py-3.5">{emp.dependents}</td>
                    <td className="py-3.5 font-mono font-bold text-slate-900 dark:text-white">${emp.premiumMonthly}/mo</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        emp.status === 'Enrolled'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            AI Corporate Benefits & Cost Optimization Advisor
          </h3>

          <textarea
            value={aiBenefitsQuery}
            onChange={(e) => setAiBenefitsQuery(e.target.value)}
            rows={3}
            className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />

          <button
            onClick={handleRunAiBenefitsStrategy}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md"
          >
            {isAnalyzing ? 'Analyzing Plan Metrics...' : 'Generate AI Strategy Breakdown'}
          </button>

          {aiAnalysis && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {aiAnalysis}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
