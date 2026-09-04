import React, { useState } from 'react';
import { UserPlus, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

// Patient self-enrollment screen. Creates both a Supabase Auth user and the
// linked public.users profile row (via the handle_new_user trigger with
// role = 'patient'). No real PHI is collected beyond name and contact info.
// No paid API or fake HIPAA claims.

interface Props {
  onBackToLogin: () => void;
}

export const SignupScreen: React.FC<Props> = ({ onBackToLogin }) => {
  const { signUpPatient } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLocalDev =
    typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await signUpPatient(email.trim(), password, fullName.trim());
      // If auto-confirm is off, session is null — show success message.
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="text-center text-slate-500 dark:text-slate-400 text-sm">
          <p className="font-semibold mb-2">Self-enrollment requires Supabase</p>
          <p>Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-up.</p>
          <button onClick={onBackToLogin} className="mt-4 text-blue-600 hover:underline text-sm">
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Account created</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your patient account has been registered. If email confirmation is enabled, check your inbox
            to verify your email before signing in.
          </p>
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-500 text-white shadow-lg shadow-emerald-500/20">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create Patient Account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Self-enrollment for SBOS HealthOS
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
        >
          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Re-enter password"
              minLength={8}
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
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 transition-all"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? 'Creating account...' : 'Create account'}
          </button>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>

        {isLocalDev && (
          <p className="mt-4 text-center text-[11px] text-slate-400">
            New patient accounts default to role &#39;patient&#39; and no organization assignment.
          </p>
        )}
      </div>
    </div>
  );
};
