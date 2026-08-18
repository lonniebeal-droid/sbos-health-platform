import React, { useState } from 'react';
import { X, ShieldCheck, Download, Copy, Check, QrCode, CreditCard } from 'lucide-react';
import { samplePatient, sampleBenefitsPlan } from '../../data/mockData';
import type { BenefitsPlan, Patient } from '../../types';

interface InsuranceCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient;
  plan?: BenefitsPlan;
}

export const InsuranceCardModal: React.FC<InsuranceCardModalProps> = ({ isOpen, onClose, patient = samplePatient, plan = sampleBenefitsPlan }) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(patient.insuranceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Digital Insurance ID Card</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Side Switcher */}
        <div className="flex justify-center p-3 bg-slate-50 dark:bg-slate-950/50">
          <div className="p-1 rounded-xl bg-slate-200 dark:bg-slate-800 flex gap-1 text-xs font-semibold">
            <button
              onClick={() => setCardSide('front')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                cardSide === 'front' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Card Front
            </button>
            <button
              onClick={() => setCardSide('back')}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                cardSide === 'back' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Card Back
            </button>
          </div>
        </div>

        {/* Card Display */}
        <div className="p-6 flex justify-center">
          {cardSide === 'front' ? (
            <div className="w-full aspect-[1.58/1] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-5 shadow-2xl relative overflow-hidden border border-white/10 flex flex-col justify-between">
              
              {/* Background watermark icon */}
              <ShieldCheck className="absolute -right-6 -bottom-6 w-48 h-48 text-white/5 pointer-events-none" />

              {/* Top row */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-teal-400" />
                    <span className="font-extrabold text-lg tracking-wider">SBOS HEALTH</span>
                  </div>
                  <p className="text-[10px] text-teal-200 uppercase font-mono tracking-widest mt-0.5">
                    {plan.planName}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  {plan.networkType} IN-NETWORK
                </span>
              </div>

              {/* Middle Member Info */}
              <div className="my-2 space-y-1">
                <p className="text-[10px] uppercase text-slate-400 font-medium">Subscriber Name</p>
                <p className="font-bold text-base text-white tracking-wide">{patient.name}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-medium">Member ID</p>
                    <p className="font-mono font-bold text-xs text-teal-300">{patient.insuranceId}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-slate-400 font-medium">Group Number</p>
                    <p className="font-mono font-bold text-xs text-slate-200">{patient.policyGroup}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Copay Grid */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-4 gap-1 text-center">
                <div>
                  <p className="text-[8px] text-slate-400">PCP</p>
                  <p className="text-xs font-bold text-teal-300">${plan.copays.primaryCare}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400">SPEC</p>
                  <p className="text-xs font-bold text-teal-300">${plan.copays.specialist}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400">URGENT</p>
                  <p className="text-xs font-bold text-teal-300">${plan.copays.urgentCare}</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400">ER</p>
                  <p className="text-xs font-bold text-teal-300">${plan.copays.emergencyRoom}</p>
                </div>
              </div>

            </div>
          ) : (
            <div className="w-full aspect-[1.58/1] rounded-2xl bg-slate-900 text-white p-5 shadow-2xl relative overflow-hidden border border-slate-700 flex flex-col justify-between text-xs">
              
              <div className="bg-black/60 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1">
                <p className="font-bold text-slate-300">PROVIDER BILLING REFERENCE:</p>
                <p className="text-slate-400 font-mono">Payer ID: demo only | Live EDI portal not configured</p>
                <p className="text-slate-400">Provider support line not configured for production use</p>
              </div>

              <div className="flex items-center justify-between my-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-300">Care Support</p>
                  <p className="text-xs font-mono text-teal-400">Demo support contact</p>
                  <p className="text-[9px] text-slate-400">Production hotline is not configured yet</p>
                </div>
                <div className="w-16 h-16 bg-white p-1 rounded-lg flex items-center justify-center">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
              </div>

              <p className="text-[8px] text-slate-500 text-center border-t border-slate-800 pt-1">
                This card is for identification purposes only and does not guarantee coverage.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 justify-between">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
            {copied ? 'Copied ID' : 'Copy Member ID'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => alert('Demo ID card action. Wallet/PDF export is not configured yet.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Demo Wallet / PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
