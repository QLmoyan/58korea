-- 58korea post views V1 — idempotent
-- Apply with: npx tsx scripts/apply-post-views-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.post_views (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id bigint NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS post_views_user_viewed_idx
  ON public.post_views (user_id, viewed_at DESC);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.post_views FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE public.post_views TO authenticated;
GRANT ALL ON TABLE public.post_views TO service_role;

DROP POLICY IF EXISTS post_views_select_own ON public.post_views;
DROP POLICY IF EXISTS post_views_insert_own ON public.post_views;
DROP POLICY IF EXISTS post_views_update_own ON public.post_views;

CREATE POLICY post_views_select_own
  ON public.post_views
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY post_views_insert_own
  ON public.post_views
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

CREATE POLICY post_views_update_own
  ON public.post_views
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_id
        AND p.moderation_status = 'published'
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
