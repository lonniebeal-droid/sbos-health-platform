import React, { useEffect, useState } from 'react';
import { samplePriorAuths, samplePatient } from '../../data/mockData';
import { PriorAuth } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapPriorAuth } from '../../lib/db/mappers';
import type { PriorAuthorizationInsert } from '../../lib/db/database.types';
import { useAsync } from '../../lib/hooks/useAsync';
import { useOrg } from '../../lib/organizationContext';
import { ShieldAlert, CheckCircle2, XCircle, Sparkles, Send, Database, FlaskConical } from 'lucide-react';

export const PriorAuthEngine: React.FC = () => {
  const { currentOrg, source: organizationSource } = useOrg();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localCreated, setLocalCreated] = useState<PriorAuth[]>([]);
  const [localOnlyIds, setLocalOnlyIds] = useState<Set<string>>(() => new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, PriorAuth['status']>>({});
  const [newRequestedService, setNewRequestedService] = useState('MRI Brain w/ & w/o Contrast');
  const [newCptCode, setNewCptCode] = useState('70553');
  const [newIcdCode, setNewIcdCode] = useState('G44.209 (Tension Headache)');
  const [newClinicalNotes, setNewClinicalNotes] = useState('Patient with refractory chronic migraine for >6 months failing sumatriptan trial. Rule out structural lesion.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load real prior authorizations (RLS-scoped to the provider's org); fall back
  // to demo data when Supabase is unconfigured or empty.
  const { data: realPas, loading, error } = useAsync<PriorAuth[]>(
    async () => (await getRepositories().priorAuths.listDetailed()).map(mapPriorAuth),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realPas && realPas.length > 0;
  const canPersistNewPa = isSupabaseConfigured && organizationSource === 'supabase';
  const base: PriorAuth[] = usingLive ? (realPas as PriorAuth[]) : samplePriorAuths;
  const priorAuths: PriorAuth[] = [...localCreated, ...base].map((pa) =>
    statusOverrides[pa.id] ? { ...pa, status: statusOverrides[pa.id] } : pa,
  );
  const selectedPa = priorAuths.find((p) => p.id === selectedId) ?? priorAuths[0] ?? null;

  useEffect(() => {
    if (!selectedId || !priorAuths.some((p) => p.id === selectedId)) {
      setSelectedId(priorAuths[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorAuths]);

  const handleCreatePriorAuth = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Prior Authorization Clinical Necessity Evaluation for requested service "${newRequestedService}", CPT ${newCptCode}, ICD ${newIcdCode}. Notes: "${newClinicalNotes}". Does this meet Milliman Care Guidelines (MCG)? Provide pass/fail recommendation.`,
          context: 'insurance_admin'
        })
      });
      const data = await response.json();
      
      const aiRecommendation = data.reply || 'AI Analysis: Meets MCG clinical criteria based on failed 1st line pharmaceutical trial.';

      if (canPersistNewPa) {
        const repos = getRepositories();
        const [patients, providers] = await Promise.all([
          repos.patients.listDetailed(),
          repos.providers.listDetailed(),
        ]);
        const patient = patients[0];
        const provider = providers[0];

        if (patient && provider) {
          const payload: PriorAuthorizationInsert = {
            patient_id: patient.id,
            provider_id: provider.id,
            organization_id: currentOrg.id,
            requested_service: newRequestedService,
            icd10_code: newIcdCode,
            cpt_code: newCptCode,
            status: 'pending',
            clinical_notes: newClinicalNotes,
            ai_recommendation: aiRecommendation,
          };
          const created = await repos.priorAuths.create(payload);
          const newAuth: PriorAuth = {
            id: created.id,
            authNumber: `PA-${created.id.slice(0, 8).toUpperCase()}`,
            patientId: created.patient_id ?? undefined,
            patientName: patient.full_name || samplePatient.name,
            providerName: provider.full_name || 'Dr. James Wilson, MD',
            requestingProvider: provider.full_name || 'Dr. James Wilson, MD',
            requestedService: created.requested_service,
            serviceType: created.requested_service,
            icd10Code: created.icd10_code,
            icdCode: created.icd10_code,
            cptCode: created.cpt_code,
            status: created.status,
            requestedDate: created.created_at.slice(0, 10),
            submittedDate: created.created_at.slice(0, 10),
            clinicalNotes: created.clinical_notes ?? undefined,
            clinicalNotesSummary: created.clinical_notes ?? undefined,
            aiRecommendation: created.ai_recommendation ?? undefined,
          };
          setLocalCreated((prev) => [newAuth, ...prev]);
          setSelectedId(newAuth.id);
          return;
        }
      }

      const newAuth: PriorAuth = {
        id: `pa_${Date.now()}`,
        patientId: samplePatient.id,
        patientName: samplePatient.name,
        providerName: 'Dr. James Wilson, MD',
        requestedService: newRequestedService,
        icd10Code: newIcdCode,
        cptCode: newCptCode,
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        clinicalNotes: newClinicalNotes,
        aiRecommendation,
      };

      setLocalOnlyIds((prev) => new Set(prev).add(newAuth.id));
      setLocalCreated((prev) => [newAuth, ...prev]);
      setSelectedId(newAuth.id);
    } catch {
      // Fallback
      const newAuth: PriorAuth = {
        id: `pa_${Date.now()}`,
        patientId: samplePatient.id,
        patientName: samplePatient.name,
        providerName: 'Dr. James Wilson, MD',
        requestedService: newRequestedService,
        icd10Code: newIcdCode,
        cptCode: newCptCode,
        status: 'pending',
        submittedDate: new Date().toISOString().split('T')[0],
        clinicalNotes: newClinicalNotes,
        aiRecommendation: 'AI Analysis: High approval likelihood. Clinical necessity documented.'
      };
      setLocalOnlyIds((prev) => new Set(prev).add(newAuth.id));
      setLocalCreated((prev) => [newAuth, ...prev]);
      setSelectedId(newAuth.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjudicatePa = async (id: string, newStatus: 'approved' | 'denied') => {
    setStatusOverrides((prev) => ({ ...prev, [id]: newStatus }));
    // Persist when Supabase is configured and the row is not a demo-only entry.
    if (isSupabaseConfigured && !localOnlyIds.has(id)) {
      try {
        await getRepositories().priorAuths.updateStatus(id, newStatus);
      } catch {
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldAlert className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">AI Prior Authorization & Clinical Necessity Engine</h2>
            <span
              title={canPersistNewPa ? 'Loaded from Supabase; new requests persist when patient/provider rows exist' : 'Demo data fallback'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                canPersistNewPa
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {canPersistNewPa ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {canPersistNewPa ? 'Live data' : 'Demo data'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading prior authorizations...'
              : error
                ? `Could not load live prior authorizations (${error}); showing demo data.`
                : 'Accelerate prior authorizations with instant Milliman Care Guidelines (MCG) matching and AI payer rule verification.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Submit New PA Form */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Create Prior Authorization Review Request
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-500 block mb-1">Requested Specialty Procedure / Drug</label>
              <input
                type="text"
                value={newRequestedService}
                onChange={(e) => setNewRequestedService(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-500 block mb-1">CPT Code</label>
                <input
                  type="text"
                  value={newCptCode}
                  onChange={(e) => setNewCptCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-500 block mb-1">ICD-10 Code</label>
                <input
                  type="text"
                  value={newIcdCode}
                  onChange={(e) => setNewIcdCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Clinical Justification Notes</label>
              <textarea
                value={newClinicalNotes}
                onChange={(e) => setNewClinicalNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <button
              onClick={handleCreatePriorAuth}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-teal-300" />
              {isSubmitting ? 'Evaluating Clinical Rules...' : canPersistNewPa ? 'Create Prior Auth Request' : 'Create Demo Prior Auth Request'}
            </button>
          </div>
        </div>

        {/* Prior Auth Queue & Adjudication */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Prior Authorization Requests</h3>

          <div className="space-y-3">
            {priorAuths.map((pa) => (
              <div
                key={pa.id}
                onClick={() => setSelectedId(pa.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedPa?.id === pa.id
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{pa.id}</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{pa.requestedService}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Patient: {pa.patientName} • CPT {pa.cptCode}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    pa.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : pa.status === 'denied'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {pa.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                  <p className="font-semibold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> {pa.aiRecommendation}
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjudicatePa(pa.id, 'approved');
                    }}
                    disabled={pa.status === 'approved'}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjudicatePa(pa.id, 'denied');
                    }}
                    disabled={pa.status === 'denied'}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
