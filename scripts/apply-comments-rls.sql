-- 58korea comments RLS — idempotent
-- Apply with: npx tsx scripts/apply-comments-rls.ts

BEGIN;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.comments FROM anon, authenticated;
GRANT SELECT ON TABLE public.comments TO anon, authenticated;
GRANT ALL ON TABLE public.comments TO service_role;

DROP POLICY IF EXISTS comments_select ON public.comments;
DROP POLICY IF EXISTS comments_insert ON public.comments;
DROP POLICY IF EXISTS comments_delete_all ON public.comments;
DROP POLICY IF EXISTS comments_select_published ON public.comments;

CREATE POLICY comments_select_published
  ON public.comments
  FOR SELECT
  TO anon, authenticated
  USING (moderation_status = 'published');

NOTIFY pgrst, 'reload schema';

COMMIT;
