import React, { useState } from 'react';
import { samplePatient, sampleAppointments } from '../../data/mockData';
import { Appointment } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getRepositories } from '../../lib/repositories';
import { mapAppointment } from '../../lib/db/mappers';
import { useAsync } from '../../lib/hooks/useAsync';
import { InsuranceCardModal } from './InsuranceCardModal';
import { ClaimsTracker } from './ClaimsTracker';
import { BenefitsExplainer } from './BenefitsExplainer';
import { ProviderSearch } from './ProviderSearch';
import { TelehealthRoom } from './TelehealthRoom';
import { PrescriptionsView } from './PrescriptionsView';
import { MedicalRecordsView } from './MedicalRecordsView';
import { BillPayment } from './BillPayment';
import { 
  CreditCard, 
  Calendar, 
  FileText, 
  Sparkles, 
  Pill, 
  Activity, 
  DollarSign, 
  Video, 
  ShieldCheck, 
  Search, 
  ArrowRight,
  Clock,
  User,
  CheckCircle2
} from 'lucide-react';

interface PatientDashboardProps {
  onOpenAIAssistant: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onOpenAIAssistant }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'claims' | 'benefits' | 'providers' | 'prescriptions' | 'records' | 'billing'>('overview');
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [isTelehealthActive, setIsTelehealthActive] = useState(false);
  // Locally-booked appointments (this session) layered on top of loaded data.
  const [localAppts, setLocalAppts] = useState<Appointment[]>([]);
  const { data: realAppts } = useAsync<Appointment[]>(
    async () => (await getRepositories().appointments.listDetailed()).map(mapAppointment),
    isSupabaseConfigured,
  );
  const usingLiveAppts = isSupabaseConfigured && !!realAppts && realAppts.length > 0;
  const appointments: Appointment[] = [
    ...localAppts,
    ...(usingLiveAppts ? (realAppts as Appointment[]) : sampleAppointments),
  ];

  const handleBookAppointment = (apt: Appointment) => {
    setLocalAppts((prev) => [apt, ...prev]);
  };

  const navItems = [
    { id: 'overview', label: 'Patient Home', icon: <Activity className="w-4 h-4" /> },
    { id: 'claims', label: 'Claims Tracker', icon: <FileText className="w-4 h-4" /> },
    { id: 'benefits', label: 'Benefits Explainer', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'providers', label: 'Find Care & Book', icon: <Search className="w-4 h-4" /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
    { id: 'records', label: 'Medical Records', icon: <Activity className="w-4 h-4" /> },
    { id: 'billing', label: 'Bill Payment', icon: <DollarSign className="w-4 h-4" /> },
  ];

  if (isTelehealthActive) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <TelehealthRoom onLeaveCall={() => setIsTelehealthActive(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Patient Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Welcome Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 z-10">
              <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                MEMBER ID: {samplePatient.insuranceId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {samplePatient.name}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 max-w-xl">
                Your SBOS Gold Premier PPO plan is active. You have 1 upcoming virtual consultation tomorrow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 z-10">
              <button
                onClick={() => setShowIdCardModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                View Digital ID Card
              </button>

              <button
                onClick={onOpenAIAssistant}
                className="px-4 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                Ask Jessie AI
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div
              onClick={() => setShowIdCardModal(true)}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                <CreditCard className="w-5 h-5" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950">PPO IN-NETWORK</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active Insurance Card</p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">SBOS Gold Premier</p>
            </div>

            <div
              onClick={() => setActiveTab('claims')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-center text-teal-600 dark:text-teal-400">
                <FileText className="w-5 h-5" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950">1 IN REVIEW</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recent Claims</p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">$1,100.00 Approved</p>
            </div>

            <div
              onClick={() => setActiveTab('prescriptions')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
                <Pill className="w-5 h-5" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950">2 ACTIVE RX</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Prescriptions</p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">Lisinopril 10mg</p>
            </div>

            <div
              onClick={() => setActiveTab('billing')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2"
            >
              <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                <DollarSign className="w-5 h-5" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950">DUE $70.00</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Outstanding Copay</p>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">Pay via HSA Card</p>
            </div>

          </div>

          {/* Upcoming Appointments & Telehealth Call Launcher */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Consultations & Virtual Visits
              </h2>
              <button
                onClick={() => setActiveTab('providers')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Find & Book Care <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {apt.type.toUpperCase()} CONSULT
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">{apt.providerName}</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{apt.providerSpecialty}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {apt.date} at {apt.time}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsTelehealthActive(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    Enter Virtual Telehealth Room
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'claims' && <ClaimsTracker />}
      {activeTab === 'benefits' && <BenefitsExplainer />}
      {activeTab === 'providers' && (
        <ProviderSearch
          onBookAppointment={handleBookAppointment}
          onLaunchTelehealth={() => setIsTelehealthActive(true)}
        />
      )}
      {activeTab === 'prescriptions' && <PrescriptionsView />}
      {activeTab === 'records' && <MedicalRecordsView />}
      {activeTab === 'billing' && <BillPayment />}

      {/* Digital ID Card Modal */}
      <InsuranceCardModal isOpen={showIdCardModal} onClose={() => setShowIdCardModal(false)} />

    </div>
  );
};
