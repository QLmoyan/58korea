-- 58korea post engagement V1 — idempotent
-- Apply with: npx tsx scripts/apply-post-engagement-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.post_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON public.post_likes (post_id);

CREATE TABLE IF NOT EXISTS public.post_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_favorites_user_created_idx
  ON public.post_favorites (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes = likes + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_likes_sync_count_insert ON public.post_likes;
DROP TRIGGER IF EXISTS post_likes_sync_count_delete ON public.post_likes;

CREATE TRIGGER post_likes_sync_count_insert
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_likes_count();

CREATE TRIGGER post_likes_sync_count_delete
  AFTER DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_likes_count();

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_favorites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.post_likes FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.post_favorites FROM anon, PUBLIC;

GRANT SELECT, INSERT, DELETE ON TABLE public.post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.post_favorites TO authenticated;
GRANT ALL ON TABLE public.post_likes TO service_role;
GRANT ALL ON TABLE public.post_favorites TO service_role;

DROP POLICY IF EXISTS post_likes_select_own ON public.post_likes;
DROP POLICY IF EXISTS post_likes_insert_own ON public.post_likes;
DROP POLICY IF EXISTS post_likes_delete_own ON public.post_likes;

CREATE POLICY post_likes_select_own
  ON public.post_likes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY post_likes_insert_own
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_id
        AND p.moderation_status = 'published'
    )
  );

CREATE POLICY post_likes_delete_own
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_favorites_select_own ON public.post_favorites;
DROP POLICY IF EXISTS post_favorites_insert_own ON public.post_favorites;
DROP POLICY IF EXISTS post_favorites_delete_own ON public.post_favorites;

CREATE POLICY post_favorites_select_own
  ON public.post_favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY post_favorites_insert_own
  ON public.post_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_id
        AND p.moderation_status = 'published'
    )
  );

CREATE POLICY post_favorites_delete_own
  ON public.post_favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

COMMIT;
