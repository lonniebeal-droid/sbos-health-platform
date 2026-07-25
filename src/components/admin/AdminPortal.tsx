import React, { useState } from 'react';
import { Shield, ShieldCheck, Database, Key, Activity, Server, FileText, CheckCircle2, Lock, Users, Terminal, Building2 } from 'lucide-react';
import { TenantManagement } from './TenantManagement';

interface AdminPortalProps {
  activeTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  activeTenantId = 'tnt_001',
  onSelectTenant = () => {}
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'system'>('tenants');

  const auditLogs = [
    { id: 'log_01', timestamp: '2026-07-24 19:04:12', actor: 'Dr. James Wilson (NPI 1882901230)', action: 'EHR Record Access', detail: 'Viewed Patient #pat_001 (Sarah Jenkins) vitals & allergies', ip: '192.168.1.45', hipaaVerified: true },
    { id: 'log_02', timestamp: '2026-07-24 18:52:01', actor: 'System Auto-Adjudicator', action: 'EDI 837 Adjudication', detail: 'Claim #CLM-99201 approved for $1,100.00', ip: 'internal-pod-02', hipaaVerified: true },
    { id: 'log_03', timestamp: '2026-07-24 17:10:44', actor: 'Sarah Jenkins (Member)', action: 'Telehealth Session Initiated', detail: 'Started 256-bit encrypted WebRTC video stream', ip: '73.189.201.12', hipaaVerified: true },
    { id: 'log_04', timestamp: '2026-07-24 16:30:00', actor: 'Jessie AI Engine', action: 'BIRP Clinical Note Generation', detail: 'Generated CPT 90837 and ICD F41.1 suggestions', ip: 'ai-engine-cloud', hipaaVerified: true }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-mono font-bold text-teal-300 uppercase">SBOS System Security & Governance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Enterprise Compliance & Audit Console</h1>
          <p className="text-xs text-slate-300">
            Real-time HIPAA audit logging, role-based access controls (RBAC), and 256-bit AES encryption verification.
          </p>
        </div>

        <div className="flex gap-3 text-xs">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-700 text-right">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">HIPAA Compliance Status</span>
            <span className="font-mono font-extrabold text-teal-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Certified
            </span>
          </div>
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
          <FileText className="w-4 h-4" /> HIPAA Audit Trails
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
        />
      )}

      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-500" />
              Immutable System Access & Access Audit Ledger
            </h3>
            <span className="text-xs font-mono text-slate-400">SOC2 Type II Compliant</span>
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
                    <td className="py-3 font-bold text-slate-900 dark:text-white font-sans">{log.actor}</td>
                    <td className="py-3 font-semibold text-blue-600 dark:text-blue-400 font-sans">{log.action}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 font-sans">{log.detail}</td>
                    <td className="py-3 text-slate-400">{log.ip}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold font-sans">
                        AES-256
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
            <span className="text-[10px] font-bold text-slate-400 uppercase">Gemini 2.5 Flash API</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">Operational (18ms)</p>
            <p className="text-xs text-slate-500">Live AI Clinical & Benefits Assistance</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">EDI 837/834 Clearinghouse</span>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">Connected</p>
            <p className="text-xs text-slate-500">Real-time Adjudication Sync</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">256-Bit WebRTC Relay</span>
            <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">Active (1080p)</p>
            <p className="text-xs text-slate-500">Telehealth Video Bridge</p>
          </div>
        </div>
      )}

    </div>
  );
};
