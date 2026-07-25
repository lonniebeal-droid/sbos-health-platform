import React, { useEffect, useState } from 'react';
import { samplePatient } from '../../data/mockData';
import { Patient } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapPatient } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { Search, UserCheck, Heart, AlertCircle, Phone, Mail, MapPin, Calendar, FileText, ChevronRight, Activity, Database, FlaskConical } from 'lucide-react';

const MOCK_PATIENTS: Patient[] = [
  samplePatient,
  {
    id: 'pat_002',
    name: 'Marcus Vance',
    dob: '1982-11-04',
    gender: 'Male',
    phone: '(555) 948-2019',
    email: 'marcus.vance@example.com',
    address: '101 California St, San Francisco, CA',
    insuranceId: 'SBOS-77182901',
    policyGroup: 'SBOS-GOLD-HMO-2026',
    primaryCarePhysician: 'Dr. James Wilson, MD',
    bloodType: 'O+',
    allergies: ['Sulfa drugs'],
    chronicConditions: ['Type 2 Diabetes', 'Hyperlipidemia'],
    recentVitals: { bloodPressure: '132/84', heartRate: 78, spO2: 98, weightLbs: 188, date: '2026-07-22' }
  }
];

export const PatientManagement: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Load the real patient directory (RLS scopes it to the provider's org).
  // Falls back to demo data when Supabase is unconfigured or returns nothing.
  const { data: realPatients, loading, error } = useAsync<Patient[]>(
    async () => (await getRepositories().patients.listDetailed()).map(mapPatient),
    isSupabaseConfigured,
  );

  const usingLive = isSupabaseConfigured && !!realPatients && realPatients.length > 0;
  const patientsList: Patient[] = usingLive ? (realPatients as Patient[]) : MOCK_PATIENTS;

  // Keep a valid selection as the list resolves.
  useEffect(() => {
    if (!selectedPatient || !patientsList.some((p) => p.id === selectedPatient.id)) {
      setSelectedPatient(patientsList[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientsList]);

  const filteredPatients = patientsList.filter((p) =>
    (p.name + p.insuranceId).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <UserCheck className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">EHR Patient Directory & Clinical History</h2>
            <span
              title={usingLive ? 'Loaded from Supabase (RLS-scoped to your org)' : 'Demo data — connect Supabase to load live records'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLive
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLive ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLive ? 'Live data' : 'Demo data'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading patient records…'
              : error
                ? `Could not load live records (${error}); showing demo data.`
                : 'Search patient records, examine allergy alerts, chronic disease conditions, and vitals history.'}
          </p>
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-white/10 text-white placeholder-slate-300 rounded-xl text-xs border border-white/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Patient Roster */}
        <div className="lg:col-span-5 space-y-3">
          {filteredPatients.map((patient) => {
            const isSelected = selectedPatient?.id === patient.id;
            return (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{patient.insuranceId}</span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{patient.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      DOB: {patient.dob} ({patient.gender})
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {patient.chronicConditions.map((cond, idx) => (
                    <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Patient EHR Deep-Dive Drawer */}
        <div className="lg:col-span-7">
          {selectedPatient ? (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
              
              <div className="flex justify-between items-start pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                    MEMBER ID: {selectedPatient.insuranceId}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPatient.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedPatient.address} • {selectedPatient.phone}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedPatient.policyGroup}
                </span>
              </div>

              {/* Allergy Alert Banner */}
              {selectedPatient.allergies.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold">ALLERGY WARNING: </span>
                    {selectedPatient.allergies.join(', ')}
                  </div>
                </div>
              )}

              {/* Recent Vitals Grid */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Latest Vitals Telemetry ({selectedPatient.recentVitals.date})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Blood Pressure</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPatient.recentVitals.bloodPressure}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Heart Rate</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPatient.recentVitals.heartRate} bpm</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SpO2 Oxygen</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPatient.recentVitals.spO2}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Weight</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedPatient.recentVitals.weightLbs} lbs</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              Select a patient from the left to view EHR medical record.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
