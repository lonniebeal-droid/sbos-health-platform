import React, { useState } from 'react';
import { useAuth } from '../../lib/authContext';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import {
  UserPlus, Loader2, CheckCircle2, AlertCircle, Database, FlaskConical, ShieldCheck,
} from 'lucide-react';

interface IntakeFormState {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  payerName: string;
  planName: string;
  memberId: string;
  groupNumber: string;
  policyHolderName: string;
  relationshipToPatient: 'self' | 'spouse' | 'child' | 'other';
  networkType: '' | 'PPO' | 'HMO' | 'EPO';
}

const EMPTY_FORM: IntakeFormState = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  payerName: '',
  planName: '',
  memberId: '',
  groupNumber: '',
  policyHolderName: '',
  relationshipToPatient: 'self',
  networkType: '',
};

/**
 * Patient intake: registers a real patient row plus an optional coverage
 * record. Writes go straight to Supabase under the signed-in staff member's
 * session — RLS restricts patient/insurance_info writes to admin/front_desk/
 * staff/medical_biller/provider roles inside their own organization.
 */
export const PatientIntake: React.FC<{ onRegistered?: () => void }> = ({ onRegistered }) => {
  const auth = useAuth();
  const [form, setForm] = useState<IntakeFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successName, setSuccessName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveMode = isSupabaseConfigured && !!auth.profile?.organization_id;

  const set = <K extends keyof IntakeFormState>(key: K) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email address looks invalid.';
    if (form.payerName.trim() && !form.memberId.trim()) return 'Member ID is required when a payer is entered.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!liveMode || !auth.profile?.organization_id) {
      setError('Patient intake requires a configured Supabase backend and a staff account.');
      return;
    }
    setSubmitting(true);
    try {
      const repos = getRepositories();
      const patient = await repos.patients.create({
        organization_id: auth.profile.organization_id,
        user_id: null,
        full_name: form.fullName.trim(),
        date_of_birth: form.dateOfBirth || null,
        gender: form.gender.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      if (form.payerName.trim()) {
        await repos.insuranceInfo.create({
          organization_id: auth.profile.organization_id,
          patient_id: patient.id,
          payer_name: form.payerName.trim(),
          plan_name: form.planName.trim() || null,
          member_id: form.memberId.trim(),
          group_number: form.groupNumber.trim() || null,
          policy_holder_name: form.policyHolderName.trim() || null,
          relationship_to_patient: form.relationshipToPatient,
          coverage_start_date: null,
          coverage_end_date: null,
          status: 'active',
          network_type: form.networkType === '' ? null : form.networkType,
          individual_deductible_cents: null,
          deductible_met_cents: null,
          out_of_pocket_max_cents: null,
          out_of_pocket_met_cents: null,
          copays: null,
        });
      }
      setSuccessName(patient.full_name);
      setForm(EMPTY_FORM);
      onRegistered?.();
      setTimeout(() => setSuccessName(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelCls = 'block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">Patient Intake & Registration</h2>
            <span
              title={liveMode ? 'Registrations write directly to your Supabase tenant' : 'Requires a configured Supabase backend and staff account'}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-2 ${
                liveMode
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-100 border-amber-400/30'
              }`}
            >
              {liveMode ? <Database className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />}
              {liveMode ? 'Live registration' : 'Backend not connected'}
            </span>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Registers the patient in your organization and optionally attaches an insurance coverage record.
            Insurance eligibility is NOT verified in real time — no clearinghouse integration exists yet.
          </p>
        </div>
      </div>

      {successName && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span><strong>{successName}</strong> was registered successfully.</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-500" /> Patient Demographics
          </h3>
          <div>
            <label className={labelCls} htmlFor="intake-full-name">Full Name *</label>
            <input id="intake-full-name" className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Jordan Rivera" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="intake-dob">Date of Birth</label>
              <input id="intake-dob" type="date" className={inputCls} value={form.dateOfBirth} onChange={set('dateOfBirth')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="intake-gender">Gender</label>
              <input id="intake-gender" className={inputCls} value={form.gender} onChange={set('gender')} placeholder="e.g. female" />
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="intake-email">Email</label>
            <input id="intake-email" type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="jordan@example.com" />
          </div>
          <div>
            <label className={labelCls} htmlFor="intake-phone">Phone</label>
            <input id="intake-phone" className={inputCls} value={form.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
          </div>
          <div>
            <label className={labelCls} htmlFor="intake-address">Address</label>
            <input id="intake-address" className={inputCls} value={form.address} onChange={set('address')} placeholder="Street, City, State ZIP" />
          </div>
        </div>

        {/* Insurance */}
        <div className="space-y-4 flex flex-col">
          <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-500" /> Coverage (Optional)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="intake-payer">Payer Name</label>
                <input id="intake-payer" className={inputCls} value={form.payerName} onChange={set('payerName')} placeholder="SBOS Gold Premier" />
              </div>
              <div>
                <label className={labelCls} htmlFor="intake-plan">Plan Name</label>
                <input id="intake-plan" className={inputCls} value={form.planName} onChange={set('planName')} placeholder="Gold Premier PPO" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="intake-member">Member ID {form.payerName.trim() ? '*' : ''}</label>
                <input id="intake-member" className={inputCls} value={form.memberId} onChange={set('memberId')} placeholder="SBOS-00000000" />
              </div>
              <div>
                <label className={labelCls} htmlFor="intake-group">Group Number</label>
                <input id="intake-group" className={inputCls} value={form.groupNumber} onChange={set('groupNumber')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="intake-holder">Policy Holder</label>
                <input id="intake-holder" className={inputCls} value={form.policyHolderName} onChange={set('policyHolderName')} />
              </div>
              <div>
                <label className={labelCls} htmlFor="intake-rel">Relationship to Patient</label>
                <select id="intake-rel" className={inputCls} value={form.relationshipToPatient} onChange={set('relationshipToPatient')}>
                  <option value="self">Self</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls} htmlFor="intake-network">Network Type</label>
              <select id="intake-network" className={inputCls} value={form.networkType} onChange={set('networkType')}>
                <option value="">Unknown</option>
                <option value="PPO">PPO</option>
                <option value="HMO">HMO</option>
                <option value="EPO">EPO</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {submitting ? 'Registering patient...' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  );
};
