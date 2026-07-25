// Secure messaging service: threads, messages, read receipts, recipients.
// Access is participant-based (enforced by RLS); thread creation goes through the
// create_message_thread SECURITY DEFINER RPC. Factory-based for testability.

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireSupabase } from '../supabaseClient';
import { createAuthService } from './authService';
import { mapMessageThread, mapMessage } from '../db/mappers';
import type { MessageThread, Message, Role } from '../../types';
import type {
  MessageThreadWithParticipants, MessageWithSender, AuditLogInsert,
} from '../db/database.types';

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface Recipient { id: string; name: string; role: Role }

export function createMessagingService(client: SupabaseClient) {
  const auth = createAuthService(client);

  async function uid(): Promise<string> {
    const u = await auth.getAuthUser();
    if (!u) throw new Error('Not authenticated');
    return u.id;
  }

  return {
    async listThreads(): Promise<MessageThread[]> {
      const me = await uid();
      const rows = unwrap<MessageThreadWithParticipants[]>(
        await client
          .from('message_threads')
          .select('*, participants:thread_participants(user_id, last_read_at, user:users(full_name, role))')
          .order('last_message_at', { ascending: false }),
      );
      return rows.map((r) => mapMessageThread(r, me));
    },

    async listMessages(threadId: string): Promise<Message[]> {
      const rows = unwrap<MessageWithSender[]>(
        await client
          .from('messages')
          .select('*, sender:users(full_name)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true }),
      );
      return rows.map(mapMessage);
    },

    async sendMessage(threadId: string, body: string): Promise<void> {
      const me = await uid();
      const profile = await auth.getCurrentProfile();
      unwrap(
        await client.from('messages').insert({
          thread_id: threadId,
          organization_id: profile?.organization_id ?? null,
          sender_id: me,
          body,
        }).select().single(),
      );
      await client.from('message_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
      // Audit trail (best-effort).
      try {
        const entry: AuditLogInsert = {
          organization_id: profile?.organization_id ?? null,
          actor_id: me,
          action: 'MESSAGE_SENT',
          resource_type: 'MessageThread',
          resource_id: threadId,
          details: null,
          ip_address: null,
        };
        await client.from('audit_logs').insert(entry);
      } catch { /* audit failure must not fail the send */ }
    },

    /** Create a thread (participants + first message) via the definer RPC. */
    async createThread(subject: string, participantIds: string[], body: string): Promise<string> {
      const { data, error } = await client.rpc('create_message_thread', {
        p_subject: subject, p_participant_ids: participantIds, p_body: body,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },

    async markRead(threadId: string): Promise<void> {
      const me = await uid();
      await client.from('thread_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('thread_id', threadId).eq('user_id', me);
    },

    /** Other users in the caller's org, for the new-thread recipient picker. */
    async listRecipients(): Promise<Recipient[]> {
      const me = await uid();
      const rows = unwrap<Array<{ id: string; full_name: string; role: Role }>>(
        await client.from('users').select('id, full_name, role').order('full_name'),
      );
      return rows.filter((r) => r.id !== me).map((r) => ({ id: r.id, name: r.full_name, role: r.role }));
    },
  };
}

export type MessagingService = ReturnType<typeof createMessagingService>;

export function getMessagingService(): MessagingService {
  return createMessagingService(requireSupabase());
}
