import React, { useEffect, useState } from 'react';
import { PlugZap, RefreshCw, Unplug } from 'lucide-react';
import { requireSupabase } from '../../lib/supabaseClient';
import { MEDICAL_VENDORS, DEFAULT_SMART_SCOPES, capabilityUrl, type MedicalVendor } from '../../lib/medicalConnector';

type Row = {
  id: string; organization_id: string; vendor: MedicalVendor; base_url: string;
  client_id: string | null; scopes: string[]; status: string;
  fhir_version: string | null; last_tested_at: string | null; last_error: string | null;
};

export const MedicalConnectorPanel: React.FC<{ organizationId: string }> = ({ organizationId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [vendor, setVendor] = useState<MedicalVendor>('Epic');
  const [baseUrl, setBaseUrl] = useState('');
  const [clientId, setClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    const { data, error } = await requireSupabase().from('medical_connectors').select('*').eq('organization_id', organizationId).order('updated_at', { ascending: false });
    if (error) throw error;
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => { if (organizationId) load().catch((e) => setMessage(String(e.message ?? e))); }, [organizationId]);

  const save = async () => {
    setBusy(true); setMessage('');
    const { error } = await requireSupabase().from('medical_connectors').upsert({
      organization_id: organizationId, vendor, base_url: baseUrl.trim(), client_id: clientId.trim() || null,
      scopes: DEFAULT_SMART_SCOPES, status: 'not_connected', last_error: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,vendor' });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage('Connector saved. Run Test Connection before any data sync.'); await load();
  };

  const testConnection = async (row: Row) => {
    setBusy(true); setMessage('Testing FHIR CapabilityStatement only. No patient data is requested.');
    const db = requireSupabase();
    await db.from('medical_connectors').update({ status: 'testing', last_error: null }).eq('id', row.id).eq('organization_id', organizationId);
    try {
      const res = await fetch(capabilityUrl(row.base_url), { headers: { Accept: 'application/fhir+json, application/json' } });
      if (!res.ok) throw new Error(`FHIR metadata returned HTTP ${res.status}`);
      const data = await res.json();
      await db.from('medical_connectors').update({ status: 'connected', fhir_version: data.fhirVersion ?? null, last_tested_at: new Date().toISOString(), last_error: null }).eq('id', row.id).eq('organization_id', organizationId);
      setMessage('FHIR endpoint verified. SMART authorization and PHI sync remain disabled until vendor credentials/approval exist.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection test failed';
      await db.from('medical_connectors').update({ status: 'error', last_tested_at: new Date().toISOString(), last_error: msg }).eq('id', row.id).eq('organization_id', organizationId);
      setMessage(msg);
    } finally { setBusy(false); await load(); }
  };

  const disconnect = async (row: Row) => {
    setBusy(true);
    const { error } = await requireSupabase().from('medical_connectors').update({ status: 'not_connected', fhir_version: null, last_error: null }).eq('id', row.id).eq('organization_id', organizationId);
    setBusy(false); setMessage(error ? error.message : 'Local connector disabled. Vendor-side token revocation requires vendor authorization.'); await load();
  };

  return <div className="space-y-5">
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center gap-2 mb-4"><PlugZap className="w-5 h-5 text-teal-500"/><h2 className="font-bold">Doctor Office EHR / Practice-System Connector</h2></div>
      <div className="grid md:grid-cols-2 gap-3">
        <select value={vendor} onChange={(e)=>setVendor(e.target.value as MedicalVendor)} className="rounded-xl border p-3 bg-transparent">{MEDICAL_VENDORS.map(v=><option key={v}>{v}</option>)}</select>
        <input value={baseUrl} onChange={(e)=>setBaseUrl(e.target.value)} placeholder="FHIR R4 base URL" className="rounded-xl border p-3 bg-transparent"/>
        <input value={clientId} onChange={(e)=>setClientId(e.target.value)} placeholder="SMART client ID (optional until vendor registration)" className="rounded-xl border p-3 bg-transparent md:col-span-2"/>
      </div>
      <p className="text-xs text-slate-500 mt-3">Least-privilege default scopes: {DEFAULT_SMART_SCOPES.join(' ')}</p>
      <button disabled={busy || !organizationId || !baseUrl.trim()} onClick={save} className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-50">Save Connector</button>
    </div>
    {message && <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-sm">{message}</div>}
    <div className="space-y-3">{rows.map(row => <div key={row.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div><div className="font-bold">{row.vendor}</div><div className="text-xs text-slate-500 break-all">{row.base_url}</div><div className="text-xs mt-1">Status: <b>{row.status}</b>{row.fhir_version ? ` • FHIR ${row.fhir_version}` : ''}</div>{row.last_error && <div className="text-xs text-rose-500 mt-1">{row.last_error}</div>}</div>
      <div className="flex gap-2"><button disabled={busy} onClick={()=>testConnection(row)} className="px-3 py-2 rounded-xl border flex items-center gap-1"><RefreshCw className="w-4 h-4"/> Test / Retry</button><button disabled={busy} onClick={()=>disconnect(row)} className="px-3 py-2 rounded-xl border flex items-center gap-1"><Unplug className="w-4 h-4"/> Disconnect</button></div>
    </div>)}</div>
    <div className="text-xs text-slate-500">Synthetic billing contract supports X12 270/271, 837, 276/277, and 835 previews only. Production transmission is disabled until clearinghouse/payer enrollment is verified.</div>
  </div>;
};
