-- 58korea comment images V1 — idempotent
-- Apply with: npx tsx scripts/apply-comment-images-v1.ts

BEGIN;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS comments_user_id_idx
  ON public.comments (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.comment_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comment_images_comment_id_sort_idx
  ON public.comment_images (comment_id, sort_order);

ALTER TABLE public.comment_images ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.comment_images FROM anon, PUBLIC;
GRANT SELECT ON TABLE public.comment_images TO anon, authenticated;
GRANT INSERT, DELETE ON TABLE public.comment_images TO authenticated;
GRANT ALL ON TABLE public.comment_images TO service_role;

DROP POLICY IF EXISTS comment_images_select_published ON public.comment_images;
DROP POLICY IF EXISTS comment_images_insert_own ON public.comment_images;
DROP POLICY IF EXISTS comment_images_delete_own ON public.comment_images;
DROP POLICY IF EXISTS comment_images_admin_all ON public.comment_images;

CREATE POLICY comment_images_select_published
  ON public.comment_images
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments AS c
      WHERE c.id = comment_id
        AND c.moderation_status = 'published'
    )
  );

CREATE POLICY comment_images_insert_own
  ON public.comment_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.comments AS c
      WHERE c.id = comment_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY comment_images_delete_own
  ON public.comment_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments AS c
      WHERE c.id = comment_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY comment_images_admin_all
  ON public.comment_images
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

NOTIFY pgrst, 'reload schema';

COMMIT;
