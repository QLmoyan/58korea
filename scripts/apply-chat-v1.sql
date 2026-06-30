-- 58korea Chat V1 — idempotent
-- Apply with: npx tsx scripts/apply-chat-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_conversations_participant_order_chk
    CHECK (participant_a < participant_b),
  CONSTRAINT chat_conversations_distinct_participants_chk
    CHECK (participant_a <> participant_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_participants_unique_idx
  ON public.chat_conversations (participant_a, participant_b);

CREATE INDEX IF NOT EXISTS chat_conversations_last_message_at_idx
  ON public.chat_conversations (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS chat_conversations_participant_a_idx
  ON public.chat_conversations (participant_a);

CREATE INDEX IF NOT EXISTS chat_conversations_participant_b_idx
  ON public.chat_conversations (participant_b);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_body_not_blank_chk CHECK (char_length(btrim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
  ON public.chat_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS chat_messages_unread_recipient_idx
  ON public.chat_messages (conversation_id, is_read, sender_id)
  WHERE is_read = false;

CREATE TABLE IF NOT EXISTS public.chat_user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_user_blocks_distinct_users_chk CHECK (blocker_id <> blocked_id),
  CONSTRAINT chat_user_blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS chat_user_blocks_blocker_idx
  ON public.chat_user_blocks (blocker_id);

DROP TRIGGER IF EXISTS chat_conversations_set_updated_at ON public.chat_conversations;

CREATE TRIGGER chat_conversations_set_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chat_conversations FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.chat_messages FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.chat_user_blocks FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.chat_user_blocks TO authenticated;

GRANT ALL ON TABLE public.chat_conversations TO service_role;
GRANT ALL ON TABLE public.chat_messages TO service_role;
GRANT ALL ON TABLE public.chat_user_blocks TO service_role;

DROP POLICY IF EXISTS chat_conversations_select_participant ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conversations_insert_participant ON public.chat_conversations;
DROP POLICY IF EXISTS chat_conversations_update_participant ON public.chat_conversations;
DROP POLICY IF EXISTS chat_messages_select_participant ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_sender ON public.chat_messages;
DROP POLICY IF EXISTS chat_messages_update_recipient ON public.chat_messages;
DROP POLICY IF EXISTS chat_user_blocks_select_own ON public.chat_user_blocks;
DROP POLICY IF EXISTS chat_user_blocks_insert_own ON public.chat_user_blocks;
DROP POLICY IF EXISTS chat_user_blocks_delete_own ON public.chat_user_blocks;

CREATE POLICY chat_conversations_select_participant
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY chat_conversations_insert_participant
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = participant_a OR auth.uid() = participant_b)
    AND participant_a < participant_b
    AND participant_a <> participant_b
  );

CREATE POLICY chat_conversations_update_participant
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant_a OR auth.uid() = participant_b)
  WITH CHECK (auth.uid() = participant_a OR auth.uid() = participant_b);

CREATE POLICY chat_messages_select_participant
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY chat_messages_insert_sender
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY chat_messages_update_recipient
  ON public.chat_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = conversation_id
        AND (c.participant_a = auth.uid() OR c.participant_b = auth.uid())
    )
  );

CREATE POLICY chat_user_blocks_select_own
  ON public.chat_user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY chat_user_blocks_insert_own
  ON public.chat_user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocker_id <> blocked_id);

CREATE POLICY chat_user_blocks_delete_own
  ON public.chat_user_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

NOTIFY pgrst, 'reload schema';

COMMIT;
