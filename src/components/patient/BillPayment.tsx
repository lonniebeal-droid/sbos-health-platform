import React, { useState } from 'react';
import { DollarSign, CreditCard, CheckCircle2, FlaskConical } from 'lucide-react';

export const BillPayment: React.FC = () => {
  const [bills, setBills] = useState([
    {
      id: 'inv_101',
      description: 'Outpatient Facility Copay - SBOS Diagnostic Imaging',
      serviceDate: '2026-07-10',
      dueDate: '2026-08-10',
      amountDue: 30.00,
      status: 'unpaid'
    },
    {
      id: 'inv_102',
      description: 'In-Office Specialist Copay - Bay Area Orthopedics',
      serviceDate: '2026-07-18',
      dueDate: '2026-08-18',
      amountDue: 40.00,
      status: 'unpaid'
    }
  ]);

  const [payingBillId, setPayingBillId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const handlePay = (id: string) => {
    setBills((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'paid', amountDue: 0 } : b))
    );
    setPaymentSuccess(id);
    setTimeout(() => setPaymentSuccess(null), 3000);
  };

  const totalOutstanding = bills.reduce((acc, b) => acc + (b.status === 'unpaid' ? b.amountDue : 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Demo Billing, Invoices & Payment Workflow</h2>
            <span
              title="Demo workflow — no live payment processor or invoice ledger is configured yet"
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-100 border border-amber-400/30 mt-2"
            >
              <FlaskConical className="w-3 h-3" />
              Demo billing
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Review sample copays and payment states. Live HSA/FSA processing and receipt generation are not configured yet.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-right">
          <span className="text-[10px] text-teal-200 uppercase font-bold block">Total Amount Due</span>
          <span className="font-mono font-extrabold text-xl text-teal-300">${totalOutstanding.toFixed(2)}</span>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-4">
        {bills.map((bill) => (
          <div
            key={bill.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold text-slate-400">{bill.id}</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{bill.description}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>Date of Service: {bill.serviceDate}</span>
                <span>•</span>
                <span>Due Date: {bill.dueDate}</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
                <p className="font-mono font-extrabold text-base text-slate-900 dark:text-white">
                  ${bill.amountDue.toFixed(2)}
                </p>
              </div>

              {bill.status === 'paid' ? (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Paid
                </div>
              ) : (
                <button
                  onClick={() => handlePay(bill.id)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  Demo Pay
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
