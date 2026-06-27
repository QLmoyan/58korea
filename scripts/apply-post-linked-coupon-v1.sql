-- 58korea post linked coupon V1 — idempotent
-- Apply with: npx tsx scripts/apply-post-linked-coupon-v1.ts

BEGIN;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS linked_coupon_id uuid REFERENCES public.merchant_coupons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_linked_coupon_id_idx
  ON public.posts (linked_coupon_id)
  WHERE linked_coupon_id IS NOT NULL;

DROP POLICY IF EXISTS merchant_coupons_select_linked_from_published_post ON public.merchant_coupons;

CREATE POLICY merchant_coupons_select_linked_from_published_post
  ON public.merchant_coupons
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts AS p
      WHERE p.linked_coupon_id = merchant_coupons.id
        AND p.moderation_status = 'published'
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
