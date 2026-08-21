import React, { useState } from 'react';
import { Shield, Database, Server, FileText, Lock, Building2, FlaskConical } from 'lucide-react';
import { TenantManagement } from './TenantManagement';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories, mapAuditLog } from '../../lib/repositories';
import { useAsync } from '../../lib/hooks/useAsync';
import type { AuditLog } from '../../types';
import { useOrg } from '../../lib/organizationContext';

interface AdminPortalProps {
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
}

interface SystemHealth {
  status: string;
  system: string;
  version: string;
  timestamp: string;
  aiEngineActive: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  activeTenantId = 'tnt_001',
  onSelectTenant = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'system'>('tenants');
  const orgs = useOrg();

  const fallbackAuditLogs: AuditLog[] = [
    {
      id: 'log_01',
      timestamp: '2026-07-24 19:04:12',
      userId: 'demo-provider',
      userName: 'Dr. James Wilson (NPI 1882901230)',
      role: 'provider',
      action: 'EHR_RECORD_ACCESS',
      resource: 'Patient: pat_001',
      ipAddress: '192.168.1.45',
      eventSeverity: 'ROUTINE_ACCESS',
    },
    {
      id: 'log_02',
      timestamp: '2026-07-24 18:52:01',
      userId: 'system',
      userName: 'System Auto-Adjudicator',
      role: 'admin',
      action: 'EDI_837_ADJUDICATION',
      resource: 'Claim: CLM-99201',
      ipAddress: 'internal-pod-02',
      eventSeverity: 'SYSTEM_EVENT',
    },
    {
      id: 'log_03',
      timestamp: '2026-07-24 17:10:44',
      userId: 'demo-patient',
      userName: 'Sarah Jenkins (Member)',
      role: 'patient',
      action: 'TELEHEALTH_SESSION_STARTED',
      resource: 'Appointment: encrypted WebRTC video stream',
      ipAddress: '73.189.201.12',
      eventSeverity: 'CRITICAL_ACCESS',
    },
    {
      id: 'log_04',
      timestamp: '2026-07-24 16:30:00',
      userId: 'system',
      userName: 'Jessie AI Engine',
      role: 'admin',
      action: 'BIRP_NOTE_GENERATION',
      resource: 'Clinical note coding suggestion CPT 90837 / ICD F41.1',
      ipAddress: 'ai-engine-cloud',
      eventSeverity: 'SYSTEM_EVENT',
    },
  ];

  const { data: realAuditLogs, loading, error } = useAsync<AuditLog[]>(
    async () => (await getRepositories().auditLogs.list()).map((row) => mapAuditLog(row)),
    isSupabaseConfigured,
  );
  const usingLiveAuditLogs = isSupabaseConfigured && !!realAuditLogs && realAuditLogs.length > 0;
  const auditLogs = usingLiveAuditLogs ? realAuditLogs : fallbackAuditLogs;
  const { data: systemHealth, loading: systemLoading, error: systemError } = useAsync<SystemHealth>(
    async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`health check returned ${res.status}`);
      return res.json() as Promise<SystemHealth>;
    },
    true,
  );
  const systemStatus = systemHealth?.status === 'ok' ? 'Operational' : 'Not verified';
  const aiStatus = systemHealth?.aiEngineActive ? 'Configured' : 'Demo fallback';

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Shield className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-mono font-bold text-teal-300 uppercase">SBOS System Audit Log</span>
            <span
              title={usingLiveAuditLogs ? 'Loaded from Supabase audit_logs' : 'Demo audit-log fallback'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLiveAuditLogs
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLiveAuditLogs ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLiveAuditLogs ? 'Live audit data' : 'Demo audit data'}
            </span>
            <span
              title="This is an internal application log, not a certified compliance program, SOC2/HIPAA evidence, or an immutable/tamper-proof record."
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-200 border border-slate-400/30"
            >
              Internal application audit logging
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Access & Audit Log</h1>
          <p className="text-xs text-slate-300">
            {loading
              ? 'Loading audit log...'
              : error
                ? `Could not load live audit logs (${error}); showing demo data.`
                : 'Internal record of actions taken in this application. Not a certified compliance program or SOC2/HIPAA audit evidence.'}
          </p>
        </div>
      </div>

      {/* Sub Nav */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'tenants'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-400" /> Multi-Tenant Organizations & White-Label
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> Audit Log
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'system'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" /> System Health & API Telemetry
        </button>
      </div>

      {activeTab === 'tenants' && (
        <TenantManagement
          activeTenantId={activeTenantId}
          onSelectTenant={onSelectTenant}
          liveOrganizations={orgs.allOrgs}
          organizationSource={orgs.source}
          organizationLoading={orgs.loading}
          organizationError={orgs.error}
        />
      )}

      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-500" />
              System Access & Audit Log
            </h3>
            <span className="text-xs font-mono text-slate-400">Internal application log — not SOC2/HIPAA-certified evidence</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor / User</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Detail Description</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 text-slate-400 text-[11px]">{log.timestamp}</td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white font-sans">{log.userName}</td>
                    <td className="py-3 font-semibold text-blue-600 dark:text-blue-400 font-sans">{log.action}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 font-sans">{log.resource}</td>
                    <td className="py-3 text-slate-400">{log.ipAddress}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans ${
                        log.eventSeverity === 'CRITICAL_ACCESS'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {log.eventSeverity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">SBOS API Health</span>
            <p className={`text-xl font-extrabold font-mono ${
              systemHealth?.status === 'ok'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {systemLoading ? 'Checking...' : systemStatus}
            </p>
            <p className="text-xs text-slate-500">
              {systemError
                ? `Health endpoint unavailable (${systemError})`
                : systemHealth
                  ? `${systemHealth.system} v${systemHealth.version}`
                  : 'Waiting for health endpoint response'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Gemini AI Engine</span>
            <p className={`text-xl font-extrabold font-mono ${
              systemHealth?.aiEngineActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {systemLoading ? 'Checking...' : aiStatus}
            </p>
            <p className="text-xs text-slate-500">
              Uses `/api/health`; demo AI responses remain available when no API key is configured.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">External Integrations</span>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">Not verified</p>
            <p className="text-xs text-slate-500">
              Clearinghouse, WebRTC relay, and production compliance attestations still need real provider connections.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
