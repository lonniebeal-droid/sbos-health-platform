-- ====================================================================
-- SBOS — secure messaging (threads / participants / messages / attachments)
-- Migration: 20260725110000_messaging.sql
--
-- Participant-based access: a user can see a thread and its messages only if they
-- are a participant. Enforced via a SECURITY DEFINER helper to avoid RLS
-- recursion. Read receipts are tracked per participant via last_read_at.
-- Attachments are modeled here (metadata); binary upload requires Supabase
-- Storage (owner infra) and is wired separately.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id),
    subject VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.thread_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID REFERENCES public.message_threads(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id),
    sender_id UUID REFERENCES public.users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thread_participants_user ON public.thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id);

-- Participation check (SECURITY DEFINER to bypass RLS and avoid recursion).
CREATE OR REPLACE FUNCTION public.is_thread_participant(p_thread UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.thread_participants
    WHERE thread_id = p_thread AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(UUID) TO authenticated;

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_attachments TO authenticated;

-- Threads: participants read; any authenticated org user may create a thread.
CREATE POLICY threads_participant_read ON public.message_threads
  FOR SELECT TO authenticated USING (public.is_thread_participant(id));
CREATE POLICY threads_insert ON public.message_threads
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org_id() AND created_by = auth.uid());
CREATE POLICY threads_participant_update ON public.message_threads
  FOR UPDATE TO authenticated USING (public.is_thread_participant(id));

-- Participants: you can see co-participants of your threads; you manage your own
-- row (last_read_at). Participant rows are created via create_message_thread()
-- (SECURITY DEFINER), so there is no direct INSERT policy.
CREATE POLICY participants_read ON public.thread_participants
  FOR SELECT TO authenticated USING (public.is_thread_participant(thread_id));
CREATE POLICY participants_update_self ON public.thread_participants
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Messages: participants read; participants send as themselves.
CREATE POLICY messages_participant_read ON public.messages
  FOR SELECT TO authenticated USING (public.is_thread_participant(thread_id));
CREATE POLICY messages_participant_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (public.is_thread_participant(thread_id) AND sender_id = auth.uid());

-- Attachments: readable by participants of the parent message's thread.
CREATE POLICY attachments_participant_read ON public.message_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_thread_participant(m.thread_id)));
CREATE POLICY attachments_participant_insert ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND public.is_thread_participant(m.thread_id)));

-- Atomically create a thread with participants + the first message. SECURITY
-- DEFINER so participant rows can be created before the caller "is" a participant.
-- Validates that every participant is in the caller's organization.
CREATE OR REPLACE FUNCTION public.create_message_thread(
  p_subject TEXT, p_participant_ids UUID[], p_body TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org UUID := public.current_user_org_id();
  v_thread UUID;
  v_uid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.message_threads (organization_id, subject, created_by)
  VALUES (v_org, p_subject, auth.uid())
  RETURNING id INTO v_thread;

  -- Always include the creator.
  INSERT INTO public.thread_participants (thread_id, user_id)
  VALUES (v_thread, auth.uid()) ON CONFLICT DO NOTHING;

  -- Add the requested participants (only those in the caller's org).
  FOREACH v_uid IN ARRAY p_participant_ids LOOP
    IF EXISTS (SELECT 1 FROM public.users u WHERE u.id = v_uid AND u.organization_id = v_org) THEN
      INSERT INTO public.thread_participants (thread_id, user_id)
      VALUES (v_thread, v_uid) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  IF p_body IS NOT NULL AND length(trim(p_body)) > 0 THEN
    INSERT INTO public.messages (thread_id, organization_id, sender_id, body)
    VALUES (v_thread, v_org, auth.uid(), p_body);
    UPDATE public.message_threads SET last_message_at = now() WHERE id = v_thread;
  END IF;

  RETURN v_thread;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_message_thread(TEXT, UUID[], TEXT) TO authenticated;
