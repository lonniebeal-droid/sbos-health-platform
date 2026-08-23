import React, { useState } from 'react';
import { 
  Role, 
  UserProfile 
} from '../../types';
import { mockUsers } from '../../data/mockData';
import { mockTenants } from '../../data/mockTenants';
import type { TenantOrg, OrgDataSource } from '../../lib/organizationContext';
import { 
  ShieldCheck, 
  Bell, 
  Sun, 
  Moon, 
  Sparkles, 
  User, 
  Stethoscope, 
  Building2, 
  Briefcase, 
  Settings,
  ChevronDown,
  Activity,
  PhoneCall,
  Globe,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
  // When true the signed-in user's portal is fixed to their real role; the
  // persona switcher is hidden (client-side enforcement mirroring server RLS).
  roleLocked?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenAIAssistant: () => void;
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
  // Real authenticated-user info. When omitted, the header falls back to mock
  // data (dev mode without Supabase). onSignOut renders a sign-out control.
  userName?: string;
  userOrg?: string;
  organizations?: TenantOrg[];
  organizationSource?: OrgDataSource;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRole,
  onRoleChange,
  roleLocked = false,
  isDarkMode,
  onToggleTheme,
  onOpenAIAssistant,
  activeTenantId = 'tnt_001',
  onSelectTenant = (_tenantId: string) => {},
  userName,
  userOrg,
  organizations,
  organizationSource = 'fallback',
  onSignOut
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const currentUser: UserProfile = mockUsers[activeRole];
  const displayName = userName ?? currentUser.name;
  const displayOrg = userOrg ?? currentUser.organization;
  const tenantOptions = organizations?.length
    ? organizations.map((org) => ({
      id: org.id,
      name: org.name,
      tenantType: org.type,
    }))
    : mockTenants;
  const currentTenant = tenantOptions.find((t) => t.id === activeTenantId) || tenantOptions[0];
  const usingLiveOrganizations = organizationSource === 'supabase';

  const roleConfigs: { role: Role; label: string; icon: React.ReactNode; color: string }[] = [
    { role: 'patient', label: 'Patient App', icon: <User className="w-4 h-4" />, color: 'bg-emerald-500' },
    { role: 'provider', label: 'Provider Portal', icon: <Stethoscope className="w-4 h-4 text-blue-500" />, color: 'bg-blue-500' },
    { role: 'insurance', label: 'Insurance Module', icon: <Building2 className="w-4 h-4 text-indigo-500" />, color: 'bg-indigo-500' },
    { role: 'employer', label: 'Employer Portal', icon: <Briefcase className="w-4 h-4 text-amber-500" />, color: 'bg-amber-500' },
    { role: 'admin', label: 'Admin Panel', icon: <Settings className="w-4 h-4 text-rose-500" />, color: 'bg-rose-500' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-200 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  SBOS HealthOS
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                White-Label Healthcare Operating System
              </p>
            </div>
          </div>

          {/* Active Tenant Badge Switcher */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowTenantDropdown(!showTenantDropdown)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>{usingLiveOrganizations ? 'Org' : 'Demo org'}: <strong className="text-blue-600 dark:text-blue-400">{currentTenant.name}</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showTenantDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  {usingLiveOrganizations ? 'Select Active Enterprise Tenant' : 'Select Demo Enterprise Tenant'}
                </div>
                {tenantOptions.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      onSelectTenant(tenant.id);
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      tenant.id === activeTenantId
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{tenant.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{tenant.tenantType.slice(0, 6)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Persona Swapper Tabs (Desktop). Hidden when the role is locked
              to the authenticated profile — users cannot browse other portals. */}
          <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            {roleConfigs.map((config) => {
              const isActive = activeRole === config.role;
              if (roleLocked && !isActive) return null;
              return (
                <span
                  key={config.role}
                  id={`role-tab-${config.role}`}
                  aria-current={isActive && roleLocked ? 'true' : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${config.color}`} />
                  {config.icon}
                  {config.label}
                </span>
              );
            })}
          </div>

          {/* Mobile: static portal badge when locked, dropdown otherwise */}
          {roleLocked ? (
            <div className="lg:hidden">
              <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className={`w-2 h-2 rounded-full ${roleConfigs.find(r => r.role === activeRole)?.color}`} />
                {roleConfigs.find(r => r.role === activeRole)?.label}
              </span>
            </div>
          ) : (
          <div className="relative lg:hidden">
            <button
              id="mobile-persona-toggle"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <span className={`w-2 h-2 rounded-full ${roleConfigs.find(r => r.role === activeRole)?.color}`} />
              {roleConfigs.find(r => r.role === activeRole)?.label}
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showRoleDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Role Persona
                </div>
                {roleConfigs.map((config) => (
                  <button
                    key={config.role}
                    onClick={() => {
                      onRoleChange(config.role);
                      setShowRoleDropdown(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left font-medium hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      activeRole === config.role ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {config.icon}
                    {config.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            
            {/* Jessie AI Floating Trigger */}
            <button
              id="header-jessie-ai-btn"
              onClick={onOpenAIAssistant}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-medium text-xs shadow-md shadow-teal-500/20 transition-all transform active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline font-semibold">Ask Jessie AI</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={onToggleTheme}
              aria-label="Toggle dark mode"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                id="notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Notifications</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Demo preview
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Real-time notifications (claim events, appointment reminders) are not wired to a delivery service yet. This panel shows sample content only.
                  </p>
                </div>
              )}
            </div>

            {/* Profile Avatar — initials for real users; mock photo only in
                dev-fallback mode where no authenticated identity exists. */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              {userName ? (
                <span
                  aria-label={displayName}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 text-white flex items-center justify-center text-xs font-bold ring-2 ring-blue-500/30"
                >
                  {displayName.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </span>
              ) : (
                <img
                  src={currentUser.avatar}
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
                />
              )}
              <div className="hidden xl:block text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-white leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{displayOrg}</p>
              </div>
              {onSignOut && (
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="ml-1 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
