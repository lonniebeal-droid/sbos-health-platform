import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserRole } from './types';
import { Header } from './components/common/Header';
import { AIAssistantWidget } from './components/common/AIAssistantWidget';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { ProviderDashboard } from './components/provider/ProviderDashboard';
import { InsuranceHub } from './components/insurance/InsuranceHub';
import { EmployerPortal } from './components/employer/EmployerPortal';
import { AdminPortal } from './components/admin/AdminPortal';
import { OrgProvider, useOrg } from './lib/organizationContext';
import { AuthProvider, useAuth } from './lib/authContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';

function AppShell() {
  const auth = useAuth();
  const { allOrgs, source: organizationSource } = useOrg();
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

  // When authenticated, the active role comes from the real profile.
  useEffect(() => {
    if (auth.role) setCurrentRole(auth.role);
  }, [auth.role]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Auth gate (only when Supabase is configured; otherwise dev-fallback mode).
  if (auth.configured && auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }
  if (auth.configured && !auth.session) {
    return <LoginView />;
  }

  const orgName = auth.profile
    ? allOrgs.find((o) => o.id === auth.profile?.organization_id)?.name
    : undefined;

  return (
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
        userName={auth.profile?.full_name}
        userOrg={orgName}
        organizations={allOrgs}
        organizationSource={organizationSource}
        onSignOut={auth.configured ? auth.signOut : undefined}
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
        activeRole={currentRole}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SBOS™ (Smart Healthcare Operating System) • Secure healthcare operations platform — production controls in progress</span>
          <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400">Gemini AI Engine</span>
        </div>
      </footer>

    </div>
  );
}

// Auth view with login ↔ signup navigation (no React Router needed).
function LoginView() {
  const [view, setView] = useState<'login' | 'signup'>('login');
  if (view === 'signup') {
    return <SignupScreen onBackToLogin={() => setView('login')} />;
  }
  return <LoginScreen onNavigateToSignup={() => setView('signup')} />;
}

export function App() {
  return (
    <AuthProvider>
      <OrgProvider>
        <AppShell />
      </OrgProvider>
    </AuthProvider>
  );
}

export default App;
