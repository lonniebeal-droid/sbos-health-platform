import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { Header } from './components/common/Header';
import { AIAssistantWidget } from './components/common/AIAssistantWidget';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { InsuranceHub } from './components/insurance/InsuranceHub';
import { EmployerPortal } from './components/employer/EmployerPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { OrgProvider } from './lib/organizationContext';

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('patient');
  const [activeTenantId, setActiveTenantId] = useState<string>('tnt_001');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAiWidgetOpen, setIsAiWidgetOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <OrgProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
        
        {/* Universal SBOS OS Top Navigation */}
        <Header
          activeRole={currentRole}
          onRoleChange={setCurrentRole}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleDarkMode}
          onOpenAIAssistant={() => setIsAiWidgetOpen(true)}
          activeTenantId={activeTenantId}
          onSelectTenant={setActiveTenantId}
        />

        {/* Main Role-Based Workspace Container */}
        <main className="pb-16 pt-4">
          {currentRole === 'patient' && (
            <PatientDashboard onOpenAIAssistant={() => setIsAiWidgetOpen(true)} />
          )}

          {currentRole === 'provider' && (
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <ProviderDashboard />
            </div>
          )}

          {currentRole === 'insurance' && (
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <InsuranceHub />
            </div>
          )}

          {currentRole === 'employer' && (
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <EmployerPortal />
            </div>
          )}

          {currentRole === 'admin' && (
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              <AdminPortal
                activeTenantId={activeTenantId}
                onSelectTenant={setActiveTenantId}
              />
            </div>
          )}
        </main>

        {/* Jessie AI Floating Assistant Drawer */}
        <AIAssistantWidget
          isOpen={isAiWidgetOpen}
          onClose={() => setIsAiWidgetOpen(false)}
          currentRole={currentRole}
        />

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SBOS™ (Smart Healthcare Operating System) • 256-Bit Encrypted HIPAA Compliant Platform</span>
            <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400">Gemini 3.6 Flash Engine Active</span>
          </div>
        </footer>

      </div>
    </OrgProvider>
  );
}

export default App;
