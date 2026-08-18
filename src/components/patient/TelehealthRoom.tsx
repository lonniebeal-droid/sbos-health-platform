import React, { useState } from 'react';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Shield, Activity, Sparkles, User, Settings, AlertCircle } from 'lucide-react';
import { samplePatient, sampleProviders } from '../../data/mockData';

interface TelehealthRoomProps {
  onLeaveCall: () => void;
}

export const TelehealthRoom: React.FC<TelehealthRoomProps> = ({ onLeaveCall }) => {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'Dr. James Wilson', text: 'Hello Sarah! I am reviewing your blood pressure logs now.', time: '10:01 AM' }
  ]);

  const activeDoctor = sampleProviders[0];

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'You', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setChatInput('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'Dr. James Wilson', text: 'Thank you. Your vitals look stable today.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 2000);
  };

  return (
    <div className="rounded-3xl bg-slate-950 text-white overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[650px]">
      
      {/* Top Telehealth Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              SBOS Encrypted Telehealth Consult
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
                HD 1080p
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Provider: {activeDoctor.name} ({activeDoctor.specialty})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-mono flex items-center gap-1.5 border border-slate-700">
            <Shield className="w-3.5 h-3.5 text-teal-400" />
            Demo telehealth room
          </span>
          <button
            onClick={onLeaveCall}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            End Consult
          </button>
        </div>
      </div>

      {/* Main Video & Chat Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Video View */}
        <div className="flex-1 bg-slate-900 relative flex items-center justify-center p-4">
          
          {/* Doctor Stream Simulation */}
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=80"
              alt="Doctor Stream"
              className="w-full h-full object-cover"
            />

            {/* Doctor Name Overlay */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {activeDoctor.name}
            </div>

            {/* Live AI Clinical Speech Transcript Overlay */}
            <div className="absolute top-4 left-4 right-4 max-w-lg mx-auto p-3 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-teal-500/30 text-xs space-y-1 text-teal-200">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Live AI Speech Transcription & Vitals Sync
              </div>
              <p className="text-[11px] font-medium text-slate-200">
                "Sarah, your blood pressure reading of 118/76 is excellent. We will continue Lisinopril 10mg."
              </p>
            </div>

            {/* Self Video PIP (Picture-In-Picture) */}
            <div className="absolute bottom-4 right-4 w-36 sm:w-48 aspect-video rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-700 shadow-2xl">
              {isVideoOn ? (
                <img
                  src={samplePatient.familyMembers?.[0] ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' : ''}
                  alt="Your Video"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-xs">
                  <VideoOff className="w-6 h-6" />
                </div>
              )}
              <span className="absolute bottom-1 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                You (Sarah)
              </span>
            </div>

          </div>

        </div>

        {/* Side Panel: Vitals & Live Doctor Chat */}
        {showChat && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col justify-between">
            <div className="p-3 border-b border-slate-800 font-bold text-xs flex justify-between items-center">
              <span>In-Session Chat & EHR Sync</span>
              <button onClick={() => setShowChat(false)} className="text-slate-400">✕</button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              
              {/* Vitals Summary Card */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 text-[11px]">
                <div className="flex justify-between font-bold text-teal-300">
                  <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Demo Vitals</span>
                  <span>Sample</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>BP: <span className="font-mono font-bold text-white">{samplePatient.recentVitals.bloodPressure}</span></div>
                  <div>HR: <span className="font-mono font-bold text-white">{samplePatient.recentVitals.heartRate} bpm</span></div>
                </div>
              </div>

              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-2.5 rounded-xl text-xs space-y-1 ${msg.sender === 'You' ? 'bg-blue-600 text-white ml-6' : 'bg-slate-800 text-slate-200 mr-6'}`}>
                  <div className="flex justify-between text-[10px] opacity-75 font-semibold">
                    <span>{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type doctor message..."
                className="flex-1 bg-slate-800 text-white px-3 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs"
              >
                Send
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Telehealth Control Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-3 rounded-2xl border font-semibold text-xs flex items-center gap-2 transition-colors ${
              isMicOn ? 'bg-slate-800 text-white border-slate-700' : 'bg-rose-600 text-white border-rose-600'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMicOn ? 'Mute Mic' : 'Unmute'}</span>
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3 rounded-2xl border font-semibold text-xs flex items-center gap-2 transition-colors ${
              isVideoOn ? 'bg-slate-800 text-white border-slate-700' : 'bg-rose-600 text-white border-rose-600'
            }`}
          >
            {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{isVideoOn ? 'Stop Camera' : 'Start Video'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-3 rounded-2xl border font-semibold text-xs flex items-center gap-2 transition-colors ${
              showChat ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">In-Session Chat</span>
          </button>

          <button
            onClick={onLeaveCall}
            className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg flex items-center gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            End Call
          </button>
        </div>
      </div>

    </div>
  );
};
