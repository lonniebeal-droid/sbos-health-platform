import React, { useState } from 'react';
import { samplePrescriptions, samplePatient } from '../../data/mockData';
import { Prescription } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapPrescription, mapPatient } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { useAuth } from '../../lib/authContext';
import { Pill, CheckCircle2, AlertTriangle, Send, ShieldCheck, MapPin, FlaskConical, Database, Loader2 } from 'lucide-react';

export const ElectronicPrescribing: React.FC = () => {
  const auth = useAuth();
  const [localPrescriptions, setLocalPrescriptions] = useState<Prescription[]>([]);
  const [medName, setMedName] = useState('Amoxicillin 500mg');
  const [dosage, setDosage] = useState('500mg Oral Capsule');
  const [frequency, setFrequency] = useState('Take 1 capsule every 8 hours for 10 days');
  const [pharmacy, setPharmacy] = useState('Walgreens Pharmacy #1049 (2120 Market St, San Francisco, CA)');
  const [allergyAlert, setAllergyAlert] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Bump to re-read prescriptions after a new order is saved.
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: realPrescriptions, loading, error } = useAsync<Prescription[]>(
    async () => (await getRepositories().prescriptions.listDetailed()).map(mapPrescription),
    isSupabaseConfigured,
    [refreshKey],
  );
  const { data: realPatients } = useAsync(
    async () => (await getRepositories().patients.listDetailed()).map(mapPatient),
    isSupabaseConfigured,
  );
  const usingLive = isSupabaseConfigured && !!realPrescriptions && realPrescriptions.length > 0;
  const canPersistOrder = isSupabaseConfigured && !!auth.profile?.organization_id && !!realPatients && realPatients.length > 0;
  const activePatient = isSupabaseConfigured && realPatients && realPatients.length > 0
    ? realPatients[0]
    : samplePatient;
  const prescriptions = [...localPrescriptions, ...(usingLive ? realPrescriptions : samplePrescriptions)];
  const prescriberName = auth.profile?.full_name || 'Provider';

  const handleCheckAllergiesAndPrescribe = async () => {
    // Check patient allergies (e.g., Sulfa, Penicillin)
    const patientAllergies = activePatient.allergies.map(a => a.toLowerCase());
    const isPenicillinDrug = medName.toLowerCase().includes('amox') || medName.toLowerCase().includes('penic');

    if (patientAllergies.includes('penicillin') && isPenicillinDrug) {
      setAllergyAlert(`CRITICAL ALLERGY ALERT: Patient ${activePatient.name} has a documented severe Penicillin allergy! Prescribing ${medName} is contraindicated.`);
      return;
    }

    setAllergyAlert(null);

    // Live mode: persist the order as a real prescriptions row attributed to
    // the signed-in provider (RLS restricts writes to admin/provider).
    if (canPersistOrder && auth.profile?.organization_id) {
      setSubmitting(true);
      setOrderError(null);
      try {
        await getRepositories().prescriptions.create({
          organization_id: auth.profile.organization_id,
          patient_id: activePatient.id,
          provider_id: auth.profile.id,
          medication_name: medName.trim(),
          dosage: dosage.trim(),
          frequency: frequency.trim(),
          refills_remaining: 0,
          status: 'active',
          pharmacy_name: pharmacy.trim() || null,
        });
        setRefreshKey((k) => k + 1);
      } catch (e) {
        setOrderError(e instanceof Error ? e.message : 'Could not save the prescription');
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    } else {
      // Dev-fallback mode without Supabase: local-only demo order.
      const newRx: Prescription = {
        id: `rx_${Date.now()}`,
        patientId: activePatient.id,
        patientName: activePatient.name,
        medicationName: medName,
        dosage,
        frequency,
        prescribedBy: prescriberName,
        refillsRemaining: 2,
        pharmacyName: pharmacy,
        status: 'active'
      };
      setLocalPrescriptions((prev) => [newRx, ...prev]);
    }
    setIsSent(true);
    setTimeout(() => setIsSent(false), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Electronic Prescribing Review Hub</h2>
            <span
              title={usingLive ? 'Loaded from Supabase prescriptions; orders save to the patient record (internal tracking only)' : 'Demo workflow — no Surescripts connection is configured in this app yet'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                usingLive
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border border-amber-400/30'
              }`}
            >
              {usingLive ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {usingLive ? 'Live prescriptions' : 'Demo e-Rx'}
            </span>
            <span
              title="No e-prescribing network (e.g. Surescripts) integration exists — nothing here is ever sent to a real pharmacy."
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-200 border border-slate-400/30"
            >
              Internal tracking only
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            {loading
              ? 'Loading prescriptions...'
              : error
                ? `Could not load live prescriptions (${error}); showing demo data.`
                : usingLive
                  ? 'Orders are saved to the patient record and attributed to you. No e-prescribing network (Surescripts) exists — nothing is transmitted to a pharmacy.'
                  : 'Demo prescribing workflow with local allergy checks. No real e-prescribing network connection exists — nothing here is ever transmitted.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* e-Rx Order Form */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Create Medication Order for {activePatient.name}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-500 block mb-1">Medication Name & Strength</label>
              <input
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Dosage Form</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">SIG Directions</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">Selected Destination Pharmacy</label>
              <input
                type="text"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            {allergyAlert && (
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Contraindication Warning</span>
                </div>
                <p>{allergyAlert}</p>
              </div>
            )}

            {orderError && (
              <div className="p-3 rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Order failed: {orderError}
              </div>
            )}

            {isSent ? (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {usingLive ? 'Order saved to the patient record.' : 'Demo order created locally.'} Not transmitted to any pharmacy.
              </div>
            ) : (
              <button
                onClick={handleCheckAllergiesAndPrescribe}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-teal-300" />}
                Run Allergy Check & Save Medication Order
              </button>
            )}
          </div>
        </div>

        {/* Active Prescriptions Roster */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Electronic Prescriptions</h3>

          <div className="space-y-3">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{rx.medicationName}</h4>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{rx.dosage}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {localPrescriptions.some((local) => local.id === rx.id) ? 'Demo Rx' : usingLive ? 'Live Rx' : 'Demo Rx'}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="font-bold">Directions: </span>{rx.frequency}
                </p>

                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {rx.pharmacyName}
                  </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{rx.refillsRemaining} Refills</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
