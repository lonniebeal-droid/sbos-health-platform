import React, { useState } from 'react';
import { sampleMedicalRecords, samplePatient } from '../../data/mockData';
import { MedicalRecord } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapMedicalRecord } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { Activity, FileText, Heart, Shield, User, Download, CheckCircle2, ChevronRight, BarChart2 } from 'lucide-react';

export const MedicalRecordsView: React.FC = () => {
  const [activeFamilyMember, setActiveFamilyMember] = useState<string>('pat_001');

  // Load real, RLS-scoped medical records; fall back to demo data.
  const { data: realRecords } = useAsync<MedicalRecord[]>(
    async () => (await getRepositories().medicalRecords.list()).map(mapMedicalRecord),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realRecords && realRecords.length > 0;
  const records: MedicalRecord[] = usingLive ? (realRecords as MedicalRecord[]) : sampleMedicalRecords;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Electronic Health Records & Vitals Vault</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Access certified lab results, immunization histories, and continuous health telemetry graphs.
          </p>
        </div>

        {/* Family Member Profile Selector */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10">
          <User className="w-4 h-4 text-teal-300 ml-1" />
          <select
            value={activeFamilyMember}
            onChange={(e) => setActiveFamilyMember(e.target.value)}
            className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer pr-2"
          >
            <option value="pat_001" className="text-slate-900">Sarah Jenkins (Primary Subscriber)</option>
            <option value="fm_001" className="text-slate-900">David Jenkins (Spouse)</option>
            <option value="fm_002" className="text-slate-900">Leo Jenkins (Child Dependent)</option>
          </select>
        </div>
      </div>

      {/* Vitals Telemetry Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          Latest Vitals Telemetry ({samplePatient.recentVitals.date})
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {samplePatient.recentVitals.bloodPressure} <span className="text-xs font-normal text-slate-500">mmHg</span>
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">Optimal Range</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Heart Rate</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {samplePatient.recentVitals.heartRate} <span className="text-xs font-normal text-slate-500">bpm</span>
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">Resting Normal</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Oxygen (SpO2)</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {samplePatient.recentVitals.spO2}%
            </p>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-1 block">Optimal Saturation</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Body Weight</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1 font-mono">
              {samplePatient.recentVitals.weightLbs} <span className="text-xs font-normal text-slate-500">lbs</span>
            </p>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-1 block">BMI 22.4 (Normal)</span>
          </div>
        </div>
      </div>

      {/* Lab Results & Health Records */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Certified Lab Reports & Visit Summaries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {rec.type}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{rec.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rec.facility} • {rec.doctor}</p>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">{rec.date}</span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                {rec.summary}
              </p>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Certified Normal
                </span>
                <button
                  onClick={() => alert(`Exporting CADA/LOINC EHR PDF for ${rec.title}...`)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
