import React, { useEffect, useState } from 'react';
import { sampleBIRPNote, samplePatient } from '../../data/mockData';
import { BIRPNote, MedicalRecord, Patient } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapMedicalRecord, mapPatient } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { useAuth } from '../../lib/authContext';
import { Mic, MicOff, Sparkles, CheckCircle2, Save, RefreshCw, AlertCircle, Loader2, Tag, Database, FlaskConical } from 'lucide-react';

export const ClinicalDocumentation: React.FC = () => {
  const auth = useAuth();
  // Bump to re-read medical records after a note is saved.
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: realPatients, loading: patientsLoading, error: patientsError } = useAsync<Patient[]>(
    async () => (await getRepositories().patients.listDetailed()).map(mapPatient),
    isSupabaseConfigured,
  );
  const { data: realRecords, loading: recordsLoading, error: recordsError } = useAsync<MedicalRecord[]>(
    async () => (await getRepositories().medicalRecords.list()).map(mapMedicalRecord),
    isSupabaseConfigured,
    [refreshKey],
  );

  const usingLivePatient = isSupabaseConfigured && !!realPatients && realPatients.length > 0;
  const activePatient = usingLivePatient ? realPatients[0] : samplePatient;
  const patientRecords = (isSupabaseConfigured && realRecords ? realRecords : []).filter(
    (record) => record.patientId === activePatient.id,
  );
  const latestRecord = patientRecords[0] ?? null;
  const loading = patientsLoading || recordsLoading;
  const error = patientsError || recordsError;

  const [rawDictation, setRawDictation] = useState(
    'Patient presented for follow-up session. Reported work stress 7/10 and hypertension. Performed 45 min CBT restructuring and diaphragmatic breathing loop. Patient responded well with stress level reduction to 3/10. Continue biweekly sessions and current antihypertensive.'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [birpNote, setBirpNote] = useState<BIRPNote>(sampleBIRPNote);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // The signing clinician is the signed-in provider — never a hardcoded name.
  const providerName = auth.profile?.full_name || 'Provider';

  useEffect(() => {
    setBirpNote((note) => ({
      ...note,
      patientId: activePatient.id,
      patientName: activePatient.name,
      date: new Date().toISOString().split('T')[0],
    }));
  }, [activePatient.id, activePatient.name]);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setRawDictation(
          `Patient ${activePatient.name} reported anxiety symptoms (mild) and good medication adherence. Conducted 60-minute cognitive behavioral therapy and guided breathing. Patient demonstrated excellent comprehension and anxiety reduction.`
        );
        setIsRecording(false);
      }, 3000);
    }
  };

  const handleGenerateBIRP = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/clinical-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawNotes: rawDictation,
          patientName: activePatient.name,
          visitType: 'Behavioral & Primary Care Consultation'
        })
      });

      const data = await response.json();
      if (data.birpNote) {
        setBirpNote({
          id: `birp_${Date.now()}`,
          patientId: activePatient.id,
          patientName: activePatient.name,
          providerName,
          date: new Date().toISOString().split('T')[0],
          behavior: data.birpNote.behavior || 'Patient presented alert and coherent.',
          intervention: data.birpNote.intervention || 'Utilized CBT cognitive reframing.',
          response: data.birpNote.response || 'Patient reported anxiety level reduction.',
          plan: data.birpNote.plan || 'Continue biweekly therapy.',
          suggestedICD: data.birpNote.suggestedICD || ['F41.1 (Generalized Anxiety Disorder)'],
          suggestedCPT: data.birpNote.suggestedCPT || ['90837 (Psychotherapy 60m)'],
          status: 'draft'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNote = async () => {
    setSaveError(null);
    // Live mode: persist the signed note as a 'Clinical Note' medical record
    // (RLS restricts writes to clinical staff within the tenant).
    if (isSupabaseConfigured && usingLivePatient && auth.profile?.organization_id) {
      setIsSaving(true);
      try {
        const summary = [
          `B: ${birpNote.behavior}`,
          `I: ${birpNote.intervention}`,
          `R: ${birpNote.response}`,
          `P: ${birpNote.plan}`,
          `Suggested ICD-10: ${birpNote.suggestedICD.join('; ')}`,
          `Suggested CPT: ${birpNote.suggestedCPT.join('; ')}`,
        ].join('\n');
        await getRepositories().medicalRecords.create({
          organization_id: auth.profile.organization_id,
          patient_id: activePatient.id,
          record_date: new Date().toISOString().split('T')[0],
          type: 'Clinical Note',
          title: `BIRP Note — ${providerName}`,
          doctor: providerName,
          facility: null,
          summary,
          status: 'normal',
          file_url: null,
        });
        setBirpNote({ ...birpNote, status: 'signed' });
        setRefreshKey((k) => k + 1);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save the note');
      } finally {
        setIsSaving(false);
      }
      return;
    }
    // Dev-fallback mode without Supabase: local confirmation only.
    setBirpNote({ ...birpNote, status: 'signed' });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">AI Clinical Documentation & BIRP Note Generator</h2>
            <span
              title={usingLivePatient ? 'Patient context loaded from Supabase; signed notes persist to the patient record' : 'Demo patient context — connect Supabase to load live patient records'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLivePatient
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLivePatient ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLivePatient ? 'Live patient' : 'Demo patient'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading patient context and recent medical records...'
              : error
                ? `Could not load live clinical context (${error}); showing demo context.`
                : 'Draft BIRP note structure and suggested CPT/ICD-10 coding from dictation. Compliance review and provider sign-off are still required.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dictation Input Panel */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-blue-500" />
              Physician Dictation / Rough Notes
            </h3>

            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-500" />}
              {isRecording ? 'Listening...' : 'Voice Dictate'}
            </button>
          </div>

          <textarea
            value={rawDictation}
            onChange={(e) => setRawDictation(e.target.value)}
            rows={8}
            placeholder="Type or dictate patient observations, clinical interventions, and response..."
            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono leading-relaxed"
          />

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-slate-700 dark:text-slate-200">Active Patient Context</span>
              <span className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                usingLivePatient
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {usingLivePatient ? 'Supabase' : 'Demo'}
              </span>
            </div>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              {activePatient.name} • DOB {activePatient.dob} • {activePatient.primaryCarePhysician || 'No PCP on file'}
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Allergies: {activePatient.allergies.length > 0 ? activePatient.allergies.join(', ') : 'None recorded'}
            </p>
            {latestRecord && (
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Latest record: {latestRecord.title} ({latestRecord.date}) — {latestRecord.summary}
              </p>
            )}
          </div>

          <button
            onClick={handleGenerateBIRP}
            disabled={isGenerating || !rawDictation.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-teal-200" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? 'AI Structuring BIRP Note & Medical Codes...' : 'Generate BIRP Note & ICD/CPT Codes'}
          </button>
        </div>

        {/* Structured BIRP Note Result */}
        <div className="lg:col-span-7 space-y-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold text-teal-600 dark:text-teal-400">
                PATIENT: {activePatient.name}
              </span>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Formatted Clinical BIRP Note</h3>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              birpNote.status === 'signed'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              {birpNote.status === 'signed' ? 'Signed & Locked' : 'Draft Review'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            
            {/* Behavior */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 uppercase text-[10px] block">Behavior (B)</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{birpNote.behavior}</p>
            </div>

            {/* Intervention */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] block">Intervention (I)</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{birpNote.intervention}</p>
            </div>

            {/* Response */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="font-extrabold text-teal-600 dark:text-teal-400 uppercase text-[10px] block">Response (R)</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{birpNote.response}</p>
            </div>

            {/* Plan */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase text-[10px] block">Plan (P)</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{birpNote.plan}</p>
            </div>

            {/* AI Suggested Medical Codes */}
            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
              <span className="font-extrabold text-teal-800 dark:text-teal-300 text-[11px] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-500" />
                AI Suggested Medical Coding (ICD-10 & CPT)
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {birpNote.suggestedICD.map((icd, idx) => (
                  <span key={idx} className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-teal-300 text-teal-800 dark:text-teal-300">
                    ICD: {icd}
                  </span>
                ))}
                {birpNote.suggestedCPT.map((cpt, idx) => (
                  <span key={idx} className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-300 text-blue-800 dark:text-blue-300">
                    CPT: {cpt}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="pt-2 flex justify-end">
            {saveError ? (
              <div className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Save failed: {saveError}
              </div>
            ) : savedSuccess ? (
              <div className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Note signed and saved to the patient record.
              </div>
            ) : (
              <button
                onClick={handleSaveNote}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sign & Save to Patient Record
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
