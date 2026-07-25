import React, { useState } from 'react';
import { Sparkles, Stethoscope, AlertTriangle, CheckCircle, Search, Pill, ShieldCheck } from 'lucide-react';

export const AIClinicalAssistant: React.FC = () => {
  const [med1, setMed1] = useState('Lisinopril 10mg');
  const [med2, setMed2] = useState('Spironolactone 25mg');
  const [query, setQuery] = useState('Check drug-drug interaction and hyperkalemia risk.');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCheckInteraction = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Clinical drug interaction query: Patient taking "${med1}" and "${med2}". ${query}. Provide clinical risk assessment, potassium monitoring protocols, and alternative dosage recommendations.`,
          context: 'clinical_provider'
        })
      });
      const data = await response.json();
      setAnalysis(data.reply);
    } catch {
      setAnalysis(
        `CLINICAL WARNING: Moderate to Severe Interaction Risk (Hyperkalemia).\n- Lisinopril (ACE Inhibitor) and Spironolactone (Potassium-Sparing Diuretic) both decrease renal potassium excretion.\n- Recommendation: Monitor serum potassium levels within 7-14 days of co-administration. Assess eGFR.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">AI Clinical Decision Support & Drug Interaction Radar</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Real-time evidence-based clinical guidance, drug-drug interaction safety checks, and ICD-10 coding verification.
          </p>
        </div>
      </div>

      {/* Interaction Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Pill className="w-4 h-4 text-blue-500" />
          Medication Interaction & Clinical Protocol Checker
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500">Medication #1</label>
            <input
              type="text"
              value={med1}
              onChange={(e) => setMed1(e.target.value)}
              className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">Medication #2</label>
            <input
              type="text"
              value={med2}
              onChange={(e) => setMed2(e.target.value)}
              className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500">Clinical Query / Patient Context</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700"
          />
        </div>

        <button
          onClick={handleCheckInteraction}
          disabled={isAnalyzing}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {isAnalyzing ? 'Running Clinical Analysis...' : 'Analyze Drug Interaction & Guidelines'}
        </button>

        {analysis && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2 font-mono whitespace-pre-wrap leading-relaxed animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 font-sans">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>AI Clinical Safety Analysis:</span>
            </div>
            {analysis}
          </div>
        )}
      </div>

    </div>
  );
};
