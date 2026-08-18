import React, { useState } from 'react';
import { Sparkles, Send, Mic, MicOff, X, Bot, User, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { Role, ChatMessage } from '../../types';

interface AIAssistantWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: Role;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  isOpen,
  onClose,
  activeRole
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'jessie',
      text: `Hello! I am Jessie, your SBOS AI Healthcare Care Navigator. How can I assist you today?`,
      timestamp: 'Just now',
      suggestedActions: [
        'Explain my PPO benefits & copays',
        'Find in-network mental health providers',
        'How to submit a prior authorization?',
        'Estimate cost for CT Scan'
      ]
    }
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let context = 'general_patient';
      if (activeRole === 'provider') context = 'clinical_provider';
      if (activeRole === 'insurance') context = 'insurance_admin';
      if (activeRole === 'employer') context = 'employer_hr';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          context
        })
      });

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'jessie',
        text: data.reply || 'I have analyzed your healthcare inquiry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: data.suggestedActions
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      const fallbackMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'jessie',
        text: `I am currently operating in offline mode. For your SBOS Gold Premier PPO plan, your primary care copay is $20 and in-network deductible met is $1,250 / $1,500.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMic = () => {
    setIsMicActive(!isMicActive);
    if (!isMicActive) {
      setTimeout(() => {
        setInput('Can you check if my upcoming Cardiology appointment requires prior authorization?');
        setIsMicActive(false);
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight flex items-center gap-2">
              Jessie AI Care Navigator
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">Demo AI</span>
            </h3>
            <p className="text-[11px] text-teal-100 font-medium">
              SBOS Smart Intelligence Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50">
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'jessie' && (
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[82%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 block px-1">
                {msg.timestamp}
              </span>

              {/* Suggested actions chips */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Suggested actions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(action)}
                        className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors flex items-center gap-1"
                      >
                        <span>{action}</span>
                        <ArrowRight className="w-3 h-3 text-teal-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl w-max border border-slate-200 dark:border-slate-700 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
            <span>Jessie is analyzing SBOS medical & benefits knowledge...</span>
          </div>
        )}
      </div>

      {/* Mic Active Bar */}
      {isMicActive && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 border-t border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-semibold">Listening to voice dictation...</span>
          </div>
          <button onClick={toggleMic} className="text-[10px] underline">Cancel</button>
        </div>
      )}

      {/* Input controls */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={toggleMic}
            className={`p-2.5 rounded-xl border transition-colors ${
              isMicActive
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
            title="Voice Dictation"
          >
            {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask Jessie anything about ${activeRole} workflows...`}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-teal-500" />
            Secure assistant workspace — demo mode until production controls are verified
          </span>
          <span>Powered by Gemini 3.6</span>
        </div>
      </div>

    </div>
  );
};
