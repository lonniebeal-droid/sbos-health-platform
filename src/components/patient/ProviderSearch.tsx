import React, { useState } from 'react';
import { sampleProviders, sampleAppointments } from '../../data/mockData';
import { Provider, Appointment } from '../../types';
import { Search, MapPin, Star, Calendar, Clock, Video, CheckCircle, Stethoscope, ChevronRight, Filter } from 'lucide-react';

interface ProviderSearchProps {
  onBookAppointment: (appointment: Appointment) => void;
  onLaunchTelehealth: () => void;
}

export const ProviderSearch: React.FC<ProviderSearchProps> = ({
  onBookAppointment,
  onLaunchTelehealth
}) => {
  const [query, setQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [bookingDate, setBookingDate] = useState('2026-07-29');
  const [bookingTime, setBookingTime] = useState('10:00 AM');
  const [visitType, setVisitType] = useState<'telehealth' | 'in_person'>('telehealth');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const specialties = ['All', 'Internal Medicine', 'Behavioral Health', 'Cardiology'];

  const filteredProviders = sampleProviders.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.specialty.toLowerCase().includes(query.toLowerCase());
    const matchesSpecialty = selectedSpecialty === 'All' || p.specialty.includes(selectedSpecialty);
    return matchesQuery && matchesSpecialty;
  });

  const handleConfirmBooking = () => {
    if (!selectedProvider) return;

    const newApt: Appointment = {
      id: `apt_${Date.now()}`,
      patientId: 'pat_001',
      patientName: 'Sarah Jenkins',
      providerId: selectedProvider.id,
      providerName: selectedProvider.name,
      providerSpecialty: selectedProvider.specialty,
      date: bookingDate,
      time: bookingTime,
      type: visitType,
      reason: 'Routine Consultation',
      status: 'scheduled',
      meetLink: `https://sbos.health/meet/room-${Math.floor(Math.random() * 9000 + 1000)}`
    };

    onBookAppointment(newApt);
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setSelectedProvider(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" />
            <h2 className="font-bold text-lg">In-Network Provider Search & Appointment Booking</h2>
          </div>
          <p className="text-xs text-blue-200 mt-1">
            Connect with board-certified physicians, therapists, and cardiologists with instant scheduling.
          </p>
        </div>

        <button
          onClick={onLaunchTelehealth}
          className="px-4 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs shadow-md flex items-center gap-2 transition-transform active:scale-95"
        >
          <Video className="w-4 h-4 text-slate-950" />
          Launch Live Telehealth Room
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search doctor name, condition, or specialty..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          {specialties.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedSpecialty === spec
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Provider List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
          >
            <div className="p-5 space-y-3">
              <div className="flex gap-3 items-start">
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 flex-shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    IN-NETWORK PPO
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 leading-tight">{provider.name}</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{provider.specialty}</p>
                  
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{provider.rating}</span>
                    <span className="text-slate-400 font-normal">({provider.reviewCount} reviews)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {provider.bio}
              </p>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {provider.hospitalAffiliation}
                </p>
                <p className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  Next Slot: {provider.nextAvailableSlot}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setSelectedProvider(provider)}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5" />
                Schedule Visit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Schedule Appointment</h3>
              <button onClick={() => setSelectedProvider(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex gap-3 items-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
              <img src={selectedProvider.avatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <p className="font-bold text-xs text-slate-900 dark:text-white">{selectedProvider.name}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">{selectedProvider.specialty}</p>
              </div>
            </div>

            {/* Visit Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Visit Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisitType('telehealth')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    visitType === 'telehealth'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  Telehealth ($20 copay)
                </button>
                <button
                  type="button"
                  onClick={() => setVisitType('in_person')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                    visitType === 'in_person'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  In-Office Clinic
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">Time</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option>09:00 AM</option>
                  <option>10:00 AM</option>
                  <option>02:30 PM</option>
                  <option>04:00 PM</option>
                </select>
              </div>
            </div>

            {bookingSuccess ? (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Appointment Confirmed & Calendar Synced!
              </div>
            ) : (
              <button
                onClick={handleConfirmBooking}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-colors"
              >
                Confirm Booking
              </button>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
