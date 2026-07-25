import React, { useState } from 'react';
import { PatientManagement } from './PatientManagement';
import { ClinicalDocumentation } from './ClinicalDocumentation';
import { AIClinicalAssistant } from './AIClinicalAssistant';
import { ElectronicPrescribing } from '../rcm/ElectronicPrescribing';
import { PriorAuthEngine } from '../rcm/PriorAuthEngine';
import { LabIntegrationHub } from '../rcm/LabIntegrationHub';
import { MessagingCenter } from '../common/MessagingCenter';
import { Users, FileText, Stethoscope, Pill, ShieldAlert, TestTube, MessageSquare } from 'lucide-react';

export const ProviderDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'patients' | 'clinical' | 'assistant' | 'erx' | 'prior_auth' | 'labs' | 'messages'>('patients');

  const navItems = [
    { id: 'patients', label: 'EHR Patient Directory', icon: <Users className="w-4 h-4" /> },
    { id: 'clinical', label: 'AI Clinical BIRP Notes', icon: <FileText className="w-4 h-4" /> },
    { id: 'erx', label: 'e-Prescribing (Surescripts)', icon: <Pill className="w-4 h-4" /> },
    { id: 'prior_auth', label: 'Prior Auth Engine', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'labs', label: 'HL7 Lab Integration', icon: <TestTube className="w-4 h-4" /> },
    { id: 'assistant', label: 'Clinical AI Decision Support', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'messages', label: 'Secure Messages', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      
      {/* Sub-Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Views */}
      {activeTab === 'patients' && <PatientManagement />}
      {activeTab === 'clinical' && <ClinicalDocumentation />}
      {activeTab === 'erx' && <ElectronicPrescribing />}
      {activeTab === 'prior_auth' && <PriorAuthEngine />}
      {activeTab === 'labs' && <LabIntegrationHub />}
      {activeTab === 'assistant' && <AIClinicalAssistant />}
      {activeTab === 'messages' && <MessagingCenter />}

    </div>
  );
};
