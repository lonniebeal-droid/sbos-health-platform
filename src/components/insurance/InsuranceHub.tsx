import React, { useState } from 'react';
import { InsuranceClaimsCenter } from './InsuranceClaimsCenter';
import { PriorAuthEngine } from '../rcm/PriorAuthEngine';
import { EligibilityVerifier } from '../rcm/EligibilityVerifier';
import { ShieldAlert, FileText, Search, Building2 } from 'lucide-react';

export const InsuranceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'claims' | 'prior_auth' | 'eligibility'>('claims');

  return (
    <div className="space-y-6">
      
      {/* Payer Hub Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        <button
          onClick={() => setActiveTab('claims')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'claims'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Demo Claims & FWA Review
        </button>

        <button
          onClick={() => setActiveTab('prior_auth')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'prior_auth'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Prior Authorization Review
        </button>

        <button
          onClick={() => setActiveTab('eligibility')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'eligibility'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Search className="w-4 h-4" />
          Demo 270/271 Eligibility Verifier
        </button>
      </div>

      {activeTab === 'claims' && <InsuranceClaimsCenter />}
      {activeTab === 'prior_auth' && <PriorAuthEngine />}
      {activeTab === 'eligibility' && <EligibilityVerifier />}

    </div>
  );
};
