import React, { useEffect, useState } from 'react';
import { samplePrescriptions } from '../../data/mockData';
import { Prescription } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapPrescription } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { Pill, RefreshCw, MapPin, CheckCircle, Clock, AlertCircle, Phone, Calendar } from 'lucide-react';

export const PrescriptionsView: React.FC = () => {
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  // Local overrides so a refill click reflects immediately without a refetch.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, Prescription['status']>>({});

  const { data: realRx } = useAsync<Prescription[]>(
    async () => (await getRepositories().prescriptions.listDetailed()).map(mapPrescription),
    isSupabaseConfigured,
  );

  const usingLive = isSupabaseConfigured && !!realRx && realRx.length > 0;
  const basePrescriptions: Prescription[] = usingLive ? (realRx as Prescription[]) : samplePrescriptions;
  const prescriptions = basePrescriptions.map((rx) =>
    statusOverrides[rx.id] ? { ...rx, status: statusOverrides[rx.id] } : rx,
  );

  const handleRefill = async (id: string) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: 'refill_requested' }));
    setRequestSuccess(id);
    if (usingLive) {
      try {
        await getRepositories().prescriptions.requestRefill(id);
      } catch {
        // Revert the optimistic update on failure.
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
    setTimeout(() => setRequestSuccess(null), 3000);
  };

  useEffect(() => { setStatusOverrides({}); }, [usingLive]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Active Prescriptions & Automated Refill Center</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Manage active Rx medications, track remaining refills, and route electronic orders directly to your pharmacy.
          </p>
        </div>
      </div>

      {/* Prescription List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl ring-1 ring-blue-500/20">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{rx.medicationName}</h3>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{rx.dosage}</p>
                </div>
              </div>

              {rx.status === 'refill_requested' ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Refill Pending
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Active
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs space-y-2">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">Directions: </span>
                {rx.frequency}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Prescribed By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{rx.prescribedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Refills Remaining</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{rx.refillsRemaining} Refills</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{rx.pharmacyName}</span>
            </div>

            {requestSuccess === rx.id ? (
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Electronic Refill Sent to Pharmacy!
              </div>
            ) : (
              <button
                onClick={() => handleRefill(rx.id)}
                disabled={rx.refillsRemaining === 0 || rx.status === 'refill_requested'}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {rx.status === 'refill_requested' ? 'Refill Order In Process' : 'Request 1-Click Pharmacy Refill'}
              </button>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
