import React from 'react';
import { Info } from 'lucide-react';
import { healthOsPricing, industryComparison, pricingDisclaimer } from '../../data/pricing';

/**
 * Surfaces the configurable pricing tiers and comparison points defined in
 * src/data/pricing.ts. Every figure here traces back to that file — nothing
 * is hardcoded in this component — so updating real pricing later means
 * editing one data file, not this UI.
 */
export const PricingComparison: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {healthOsPricing.map((tier) => (
          <div
            key={tier.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2"
          >
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tier.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tier.description}</p>
            <div className="pt-1">
              <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                ${tier.perClaimFee.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400"> / claim</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                + ${tier.monthlyPlatformFee.toLocaleString()}/mo platform fee
              </p>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1">
              {tier.includedFeatures.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className="text-left font-semibold text-slate-600 dark:text-slate-300 px-3 py-2">Metric</th>
              <th className="text-left font-semibold text-indigo-600 dark:text-indigo-400 px-3 py-2">HealthOS</th>
              <th className="text-left font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">
                Typical alternative
              </th>
            </tr>
          </thead>
          <tbody>
            {industryComparison.map((row) => (
              <tr key={row.metric} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{row.metric}</td>
                <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400">{row.healthOs}</td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.typicalAlternative}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{pricingDisclaimer}</span>
      </div>
    </div>
  );
};
