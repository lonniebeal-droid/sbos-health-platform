import React, { useState } from 'react';
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../lib/authContext';

// Real authentication screen backed by Supabase Auth (via useAuth().signIn).
// Shown by App when Supabase is configured and there is no active session.

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isLocalDev =
    typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            SBOS HealthOS
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Secure sign-in</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
        >
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@organization.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 transition-all"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          {isLocalDev && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <p className="font-semibold mb-1">Local test accounts (password: Password123!)</p>
              <ul className="space-y-0.5 font-mono">
                <li>provider@bayarea.test</li>
                <li>patient@bayarea.test</li>
                <li>payer@sbospremier.test</li>
                <li>admin@bayarea.test</li>
              </ul>
            </div>
          )}
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          256-bit encrypted • HIPAA-conscious platform (in development)
        </p>
      </div>
    </div>
  );
};
