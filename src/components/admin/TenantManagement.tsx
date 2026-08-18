import React, { useEffect, useMemo, useState } from 'react';
import { TenantOrganization, TenantType } from '../../types';
import { mockTenants } from '../../data/mockTenants';
import type { OrgDataSource, TenantOrg } from '../../lib/organizationContext';
import { 
  Building2, 
  Palette, 
  Globe, 
  DollarSign, 
  Users, 
  Plus, 
  CheckCircle2, 
  Settings2, 
  Sparkles, 
  Edit3, 
  Lock, 
  Check, 
  Download,
  Sliders,
  Database,
  FlaskConical,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface TenantManagementProps {
  activeTenantId: string;
  onSelectTenant: (tenantId: string) => void;
  onUpdateTenant?: (updatedTenant: TenantOrganization) => void;
  liveOrganizations?: TenantOrg[];
  organizationSource?: OrgDataSource;
  organizationLoading?: boolean;
  organizationError?: string | null;
}

function toTenantType(type: TenantOrg['type']): TenantType {
  if (type === 'payer') return 'health_plan';
  return type;
}

function tenantFromOrg(org: TenantOrg): TenantOrganization {
  const slug = org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || org.id;
  return {
    id: org.id,
    name: org.name,
    subdomain: `${slug}.sbos.health`,
    customDomain: `portal.${slug}.org`,
    tenantType: toTenantType(org.type),
    primaryColor: 'from-blue-600 to-indigo-600',
    accentColor: '#2563eb',
    logoIconName: 'Building2',
    billing: {
      planTier: org.type === 'payer' ? 'Payer Suite' : 'Enterprise SaaS',
      monthlyRate: org.type === 'payer' ? 95000 : 35000,
      activeEnrollees: 0,
      renewalDate: 'Not configured',
      status: 'trial',
    },
    permissions: {
      telehealthEnabled: true,
      rcmEdiEnabled: org.type !== 'employer_group',
      priorAuthAiEnabled: org.type !== 'employer_group',
      behavioralHealthEnabled: true,
      employerPortalEnabled: org.type === 'employer_group',
      mfaEnforced: true,
    },
    branding: {
      portalTitle: `${org.name} Care Portal`,
      tagline: org.badge,
      supportEmail: 'support@sbos.health',
      supportPhone: '+1 (800) 555-0199',
      brandThemeColor: 'blue',
    },
    usersCount: 0,
  };
}

export const TenantManagement: React.FC<TenantManagementProps> = ({
  activeTenantId,
  onSelectTenant,
  onUpdateTenant,
  liveOrganizations = [],
  organizationSource = 'fallback',
  organizationLoading = false,
  organizationError = null,
}) => {
  const sourceTenants = useMemo(
    () => organizationSource === 'supabase'
      ? liveOrganizations.map(tenantFromOrg)
      : mockTenants,
    [liveOrganizations, organizationSource],
  );

  const [tenants, setTenants] = useState<TenantOrganization[]>(sourceTenants);
  const [selectedTenant, setSelectedTenant] = useState<TenantOrganization>(
    sourceTenants.find((t) => t.id === activeTenantId) || sourceTenants[0]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TenantOrganization>(selectedTenant);
  const [showNewModal, setShowNewModal] = useState(false);

  // New Tenant Form State
  const [newTenantName, setNewTenantName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [newCustomDomain, setNewCustomDomain] = useState('');
  const [newType, setNewType] = useState<TenantType>('health_system');
  const [newPlanTier, setNewPlanTier] = useState<'Enterprise SaaS' | 'Payer Suite' | 'Health System Custom'>('Enterprise SaaS');
  const usingLiveOrganizations = organizationSource === 'supabase';

  useEffect(() => {
    setTenants(sourceTenants);
    const nextSelected = sourceTenants.find((t) => t.id === activeTenantId) || sourceTenants[0];
    setSelectedTenant(nextSelected);
    setEditForm(nextSelected);
  }, [activeTenantId, sourceTenants]);

  const handleSelect = (tenant: TenantOrganization) => {
    setSelectedTenant(tenant);
    setEditForm(tenant);
    setIsEditing(false);
    onSelectTenant(tenant.id);
  };

  const handleSaveEdit = () => {
    const updated = tenants.map((t) => (t.id === editForm.id ? editForm : t));
    setTenants(updated);
    setSelectedTenant(editForm);
    setIsEditing(false);
    if (onUpdateTenant) {
      onUpdateTenant(editForm);
    }
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newSubdomain) return;

    const newTenant: TenantOrganization = {
      id: `tnt_${Date.now()}`,
      name: newTenantName,
      subdomain: `${newSubdomain.toLowerCase().replace(/\s+/g, '')}.sbos.health`,
      customDomain: newCustomDomain || `portal.${newSubdomain.toLowerCase()}.org`,
      tenantType: newType,
      primaryColor: 'from-blue-600 to-indigo-600',
      accentColor: '#2563eb',
      billing: {
        planTier: newPlanTier,
        monthlyRate: newPlanTier === 'Payer Suite' ? 95000 : 35000,
        activeEnrollees: 5000,
        renewalDate: '2027-01-01',
        status: 'active',
      },
      permissions: {
        telehealthEnabled: true,
        rcmEdiEnabled: true,
        priorAuthAiEnabled: true,
        behavioralHealthEnabled: true,
        employerPortalEnabled: true,
        mfaEnforced: true,
      },
      branding: {
        portalTitle: `${newTenantName} Care Portal`,
        tagline: 'Empowering Quality Multi-Tenant Healthcare',
        supportEmail: `support@${newSubdomain.toLowerCase()}.org`,
        supportPhone: '+1 (800) 555-0199',
        brandThemeColor: 'blue',
      },
      usersCount: 150,
    };

    setTenants([...tenants, newTenant]);
    setShowNewModal(false);
    handleSelect(newTenant);

    // Reset Form
    setNewTenantName('');
    setNewSubdomain('');
    setNewCustomDomain('');
  };

  const togglePermission = (key: keyof TenantOrganization['permissions']) => {
    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-teal-400 flex-wrap">
            <Building2 className="w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              SBOS HealthOS White-Label Engine
            </span>
            <span
              title={usingLiveOrganizations ? 'Loaded from Supabase organizations' : 'Demo tenant fallback'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLiveOrganizations
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLiveOrganizations ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLiveOrganizations ? 'Live organizations' : 'Demo organizations'}
            </span>
          </div>
          <h2 className="text-xl font-black mt-1">Multi-Tenant Healthcare Organizations & Branding</h2>
          <p className="text-xs text-blue-200 mt-0.5">
            {organizationLoading
              ? 'Loading tenant organizations...'
              : organizationError
                ? `Could not load live organizations (${organizationError}); showing demo data.`
                : 'SBOS HealthOS powers healthcare systems, health plans, behavioral health clinics, employers, and hospitals with isolated data and dynamic white-label branding.'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Provision New Tenant
        </button>
      </div>

      {/* Main Multi-Tenant Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Tenant Selector List (Left Column) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Tenants ({tenants.length})
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
              Multi-Tenant RLS
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {tenants.map((tenant) => {
              const isCurrent = tenant.id === selectedTenant.id;
              const isActiveTenantInApp = tenant.id === activeTenantId;

              return (
                <div
                  key={tenant.id}
                  onClick={() => handleSelect(tenant)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-900 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {tenant.name}
                        </span>
                        {isActiveTenantInApp && (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-emerald-500 text-white uppercase tracking-wider">
                            Active App Theme
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">{tenant.subdomain}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                    <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                      {tenant.tenantType.replace('_', ' ')}
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {tenant.billing.activeEnrollees.toLocaleString()} Members
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Tenant Details & Configuration (Right Column) */}
        <div className="lg:col-span-8 space-y-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Tenant ID: {selectedTenant.id}
                </span>
                <span className="text-xs text-slate-500 font-mono">{selectedTenant.customDomain}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {selectedTenant.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectTenant(selectedTenant.id)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Switch App to This Tenant
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel Edit' : 'Edit White-Label Branding'}
              </button>
            </div>
          </div>

          {!isEditing ? (
            /* Read-Only Overview */
            <div className="space-y-6">
              
              {/* Branding Overview Card */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-indigo-500" /> White-Label Theme & Portal Settings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Portal Header Title</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedTenant.branding.portalTitle}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Brand Tagline</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedTenant.branding.tagline}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Support Email</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedTenant.branding.supportEmail}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Support Phone</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {selectedTenant.branding.supportPhone}
                    </span>
                  </div>
                </div>
              </div>

              {/* Permissions & Feature Flags */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-teal-500" /> Tenant Feature Flags & Module Entitlements
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-semibold">
                  {Object.entries(selectedTenant.permissions).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        enabled
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      {enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* SaaS Subscription & Billing */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-500" /> Enterprise SaaS Billing & Licensing
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Plan Tier</span>
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedTenant.billing.planTier}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Monthly Recurring Revenue (MRR)</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm font-mono">${selectedTenant.billing.monthlyRate.toLocaleString()} / mo</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Renewal Date</span>
                    <span className="font-extrabold text-slate-900 dark:text-white font-mono">{selectedTenant.billing.renewalDate}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* Edit Form */
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Edit White-Label Tenant Settings</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Organization Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Custom Domain</label>
                  <input
                    type="text"
                    value={editForm.customDomain}
                    onChange={(e) => setEditForm({ ...editForm, customDomain: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Portal Title</label>
                  <input
                    type="text"
                    value={editForm.branding.portalTitle}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      branding: { ...editForm.branding, portalTitle: e.target.value }
                    })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={editForm.branding.tagline}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      branding: { ...editForm.branding, tagline: e.target.value }
                    })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="font-bold text-slate-500 block mb-2">Tenant Feature Permissions</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(editForm.permissions).map(([key, enabled]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => togglePermission(key as any)}
                      className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs transition-all ${
                        enabled
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-300'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      {enabled ? <ToggleRight className="w-6 h-6 text-blue-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-md"
                >
                  Save White-Label Configuration
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Provision New Tenant Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-400" /> Provision New Enterprise Tenant
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Organization / Tenant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., St. Jude Health System"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Tenant Subdomain Prefix</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="stjude"
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value)}
                    className="w-full p-2.5 rounded-l-xl border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  <span className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-r-xl font-mono text-slate-500">
                    .sbos.health
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Tenant Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as TenantType)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="health_system">Health System / Hospital Network</option>
                  <option value="health_plan">Insurance Payer / Health Plan</option>
                  <option value="behavioral_health">Behavioral Health & Psychiatry Network</option>
                  <option value="clinic_network">Primary & Urgent Care Clinic Network</option>
                  <option value="employer_group">Self-Insured Employer Group</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md"
                >
                  Provision Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
