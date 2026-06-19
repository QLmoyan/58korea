-- 58korea posts + post_images RLS — idempotent
-- Apply with: npx tsx scripts/apply-posts-rls.ts

BEGIN;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.posts FROM anon, authenticated;
GRANT SELECT ON TABLE public.posts TO anon, authenticated;
GRANT ALL ON TABLE public.posts TO service_role;

DROP POLICY IF EXISTS posts_select ON public.posts;
DROP POLICY IF EXISTS posts_insert ON public.posts;
DROP POLICY IF EXISTS posts_delete_all ON public.posts;
DROP POLICY IF EXISTS posts_select_published ON public.posts;

CREATE POLICY posts_select_published
  ON public.posts
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'published');

ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.post_images FROM anon, authenticated;
GRANT SELECT ON TABLE public.post_images TO anon, authenticated;
GRANT ALL ON TABLE public.post_images TO service_role;

DROP POLICY IF EXISTS post_images_select ON public.post_images;
DROP POLICY IF EXISTS post_images_insert ON public.post_images;
DROP POLICY IF EXISTS post_images_delete_all ON public.post_images;
DROP POLICY IF EXISTS post_images_select_all ON public.post_images;
DROP POLICY IF EXISTS post_images_insert_all ON public.post_images;
DROP POLICY IF EXISTS post_images_select_published ON public.post_images;

CREATE POLICY post_images_select_published
  ON public.post_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_images.post_id
        AND p.moderation_status = 'published'
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
