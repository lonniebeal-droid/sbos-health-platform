import React, { useEffect, useState } from 'react';
import { Message, MessageThread } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getMessagingService, type Recipient } from '../../lib/services/messagingService';
import { useAuth } from '../../lib/authContext';
import { useAsync } from '../../lib/hooks/useAsync';
import { MessageSquare, Send, Plus, Circle, ShieldCheck, Loader2, X } from 'lucide-react';

// Secure Patient <-> Provider / Provider <-> Provider messaging. Real, RLS-scoped:
// a user only sees threads they participate in. Requires Supabase (no demo mode).
export const MessagingCenter: React.FC = () => {
  const { profile } = useAuth();
  const myId = profile?.id ?? '';
  const [reload, setReload] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: threads, loading: threadsLoading } = useAsync<MessageThread[]>(
    () => getMessagingService().listThreads(),
    isSupabaseConfigured,
    [reload],
  );
  const { data: messages } = useAsync<Message[]>(
    () => (selectedId ? getMessagingService().listMessages(selectedId) : Promise.resolve([])),
    isSupabaseConfigured && !!selectedId,
    [selectedId, reload],
  );

  // Mark a thread read when opened.
  useEffect(() => {
    if (isSupabaseConfigured && selectedId) {
      getMessagingService().markRead(selectedId).then(() => setReload((r) => r + 1)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedThread = threads?.find((t) => t.id === selectedId) ?? null;

  const handleSend = async () => {
    if (!selectedId || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await getMessagingService().sendMessage(selectedId, body.trim());
      setBody('');
      setReload((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
        Secure messaging requires a configured backend.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <div>
            <h2 className="font-bold text-lg">Secure Messages</h2>
            <p className="text-xs text-blue-200 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> HIPAA-audited, participant-only access</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="px-3 py-2 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Message
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Thread list */}
        <div className="lg:col-span-4 space-y-2">
          {threadsLoading && <div className="p-4 text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}
          {threads && threads.length === 0 && <div className="p-4 text-xs text-slate-400">No conversations yet.</div>}
          {threads?.map((t) => {
            const others = t.participants.filter((p) => p.userId !== myId).map((p) => p.name).join(', ');
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedId === t.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.subject}</span>
                  {t.hasUnread && <Circle className="w-2.5 h-2.5 fill-teal-500 text-teal-500 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{others || 'You'}</p>
              </button>
            );
          })}
        </div>

        {/* Thread view */}
        <div className="lg:col-span-8">
          {selectedThread ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col h-[28rem]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{selectedThread.subject}</h3>
                <p className="text-[11px] text-slate-500">{selectedThread.participants.map((p) => `${p.name} (${p.role})`).join(' · ')}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages?.map((m) => {
                  const mine = m.senderId === myId;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-2.5 rounded-2xl text-xs ${mine ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                        {!mine && <p className="text-[10px] font-bold opacity-70 mb-0.5">{m.senderName}</p>}
                        <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[9px] mt-1 ${mine ? 'text-blue-200' : 'text-slate-400'}`}>{new Date(m.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a secure message…"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleSend} disabled={sending || !body.trim()} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-[11px] text-rose-500 px-3 pb-2">{error}</p>}
            </div>
          ) : (
            <div className="h-[28rem] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-sm text-slate-400">
              Select a conversation, or start a new message.
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewThreadModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => { setShowNew(false); setSelectedId(id); setReload((r) => r + 1); }}
        />
      )}
    </div>
  );
};

const NewThreadModal: React.FC<{ onClose: () => void; onCreated: (id: string) => void }> = ({ onClose, onCreated }) => {
  const [subject, setSubject] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: recipients } = useAsync<Recipient[]>(() => getMessagingService().listRecipients(), isSupabaseConfigured);

  const submit = async () => {
    if (!subject.trim() || !recipientId || !body.trim()) { setError('All fields are required.'); return; }
    setBusy(true); setError(null);
    try {
      const id = await getMessagingService().createThread(subject.trim(), [recipientId], body.trim());
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create conversation');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">New Secure Message</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700">
          <option value="">Select recipient…</option>
          {recipients?.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.role})</option>)}
        </select>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Message…" className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs border border-slate-200 dark:border-slate-700" />
        {error && <p className="text-[11px] text-rose-500">{error}</p>}
        <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
        </button>
      </div>
    </div>
  );
};
