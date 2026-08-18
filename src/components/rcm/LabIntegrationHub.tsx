import React, { useState } from 'react';
import { sampleMedicalRecords, samplePatient } from '../../data/mockData';
import { Activity, TestTube, CheckCircle2, Download, FileText, Send, Clock, Sparkles } from 'lucide-react';

export const LabIntegrationHub: React.FC = () => {
  const [labOrders, setLabOrders] = useState([
    {
      id: 'lab_101',
      testName: 'Comprehensive Metabolic Panel (CMP) & HbA1c',
      loinc: '24323-8 / 4548-4',
      facility: 'Demo Reference Lab',
      status: 'completed',
      date: '2026-07-20',
      result: 'HbA1c 5.4% (Normal), Serum Glucose 92 mg/dL'
    },
    {
      id: 'lab_102',
      testName: 'Lipid Panel with Cardiac Risk Stratification',
      loinc: '57698-3',
      facility: 'Demo Collection Site',
      status: 'pending_specimen',
      date: '2026-07-24',
      result: 'Awaiting phlebotomy collection at draw site'
    }
  ]);

  const [newTest, setNewTest] = useState('Thyroid Stimulating Hormone (TSH) w/ Reflex T4');
  const [loincCode, setLoincCode] = useState('11580-8');

  const handleOrderLab = () => {
    const newOrder = {
      id: `lab_${Date.now()}`,
      testName: newTest,
      loinc: loincCode,
      facility: 'Demo Lab Queue',
      status: 'pending_specimen',
      date: new Date().toISOString().split('T')[0],
      result: 'Demo order queued. External lab transmission is not configured.'
    };

    setLabOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Demo Laboratory Workflow Hub</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Review a demo lab-order workflow. Direct Quest/Labcorp and FHIR delivery are not configured yet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Order Form */}
        <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-500" />
            Create Demo Lab Order for {samplePatient.name}
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-500 block mb-1">Diagnostic Test / Panel</label>
              <input
                type="text"
                value={newTest}
                onChange={(e) => setNewTest(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-500 block mb-1">LOINC Code</label>
              <input
                type="text"
                value={loincCode}
                onChange={(e) => setLoincCode(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <button
              onClick={handleOrderLab}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <TestTube className="w-4 h-4 text-teal-300" />
              Transmit HL7 Electronic Lab Order
            </button>
          </div>
        </div>

        {/* Lab Order Roster */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active & Historical Lab Panels</h3>

          <div className="space-y-3">
            {labOrders.map((lab) => (
              <div
                key={lab.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">LOINC: {lab.loinc}</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{lab.testName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{lab.facility} • {lab.date}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    lab.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {lab.status === 'completed' ? 'Certified Result' : 'Pending Specimen'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {lab.result}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
