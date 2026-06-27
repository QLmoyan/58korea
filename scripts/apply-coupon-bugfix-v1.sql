-- 58korea coupon bugfix V1 — numeric redeem codes, remove notifications, redeem normalize
-- Apply with: npx tsx scripts/apply-coupon-bugfix-v1.ts

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_redeem_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || (floor(random() * 10)::integer)::text;
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_redeem_code(p_redeem_code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_trimmed text := trim(p_redeem_code);
  v_digits_only text;
BEGIN
  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RETURN NULL;
  END IF;

  v_digits_only := regexp_replace(v_trimmed, '\s', '', 'g');

  IF v_digits_only ~ '^\d+$' THEN
    RETURN v_digits_only;
  END IF;

  RETURN upper(v_digits_only);
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_user_coupon(p_redeem_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_coupon public.user_coupons%ROWTYPE;
  v_coupon public.merchant_coupons%ROWTYPE;
  v_merchant_user_id uuid;
  v_normalized_code text := public.normalize_redeem_code(p_redeem_code);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  IF v_normalized_code IS NULL OR v_normalized_code = '' THEN
    RAISE EXCEPTION '请输入核销码';
  END IF;

  SELECT uc.*
  INTO v_user_coupon
  FROM public.user_coupons uc
  WHERE uc.redeem_code = v_normalized_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '核销码无效';
  END IF;

  IF v_user_coupon.status = 'used' THEN
    RAISE EXCEPTION '该优惠券已核销';
  END IF;

  IF v_user_coupon.status = 'cancelled' THEN
    RAISE EXCEPTION '对不起，因商家改动，该优惠券已失效';
  END IF;

  IF v_user_coupon.status = 'expired' THEN
    RAISE EXCEPTION '优惠券已过期，无法核销';
  END IF;

  IF v_user_coupon.status <> 'claimed' THEN
    RAISE EXCEPTION '优惠券已失效，无法核销';
  END IF;

  IF v_user_coupon.expires_at IS NOT NULL AND now() > v_user_coupon.expires_at THEN
    UPDATE public.user_coupons
    SET status = 'expired'
    WHERE id = v_user_coupon.id;
    RAISE EXCEPTION '优惠券已过期，无法核销';
  END IF;

  SELECT mc.*
  INTO v_coupon
  FROM public.merchant_coupons mc
  WHERE mc.id = v_user_coupon.coupon_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '优惠券不存在';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION '优惠券已失效，无法核销';
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RAISE EXCEPTION '优惠券已过期，无法核销';
  END IF;

  SELECT mp.user_id
  INTO v_merchant_user_id
  FROM public.merchant_profiles mp
  WHERE mp.id = v_coupon.merchant_id;

  IF v_merchant_user_id IS NULL THEN
    RAISE EXCEPTION '商家不存在';
  END IF;

  IF v_merchant_user_id <> v_user_id AND NOT public.is_admin_member() THEN
    RAISE EXCEPTION '无权核销该优惠券';
  END IF;

  UPDATE public.user_coupons
  SET status = 'used',
      used_at = now(),
      redeemed_at = now(),
      redeemed_by = v_user_id
  WHERE id = v_user_coupon.id;

  RETURN v_user_coupon.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_post_linked_coupon(
  p_post_id bigint,
  p_coupon_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post public.posts%ROWTYPE;
  v_coupon public.merchant_coupons%ROWTYPE;
  v_mode text;
  v_notify_user_id uuid;
  v_body text;
  v_notify_users uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  SELECT *
  INTO v_post
  FROM public.posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '帖子不存在';
  END IF;

  IF v_post.author_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION '无权删除该帖子优惠券';
  END IF;

  IF v_post.linked_coupon_id IS DISTINCT FROM p_coupon_id THEN
    RAISE EXCEPTION '帖子未绑定该优惠券';
  END IF;

  SELECT mc.*
  INTO v_coupon
  FROM public.merchant_coupons AS mc
  JOIN public.merchant_profiles AS mp ON mp.id = mc.merchant_id
  WHERE mc.id = p_coupon_id
    AND mp.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '优惠券不存在或无权操作';
  END IF;

  v_body := format('商家已下架《%s》', v_coupon.title);

  SELECT array_agg(DISTINCT uc.user_id)
  INTO v_notify_users
  FROM public.user_coupons AS uc
  WHERE uc.coupon_id = p_coupon_id
    AND uc.status = 'claimed';

  UPDATE public.posts
  SET linked_coupon_id = NULL
  WHERE id = p_post_id
    AND linked_coupon_id = p_coupon_id;

  v_mode := public.deactivate_or_delete_merchant_coupon(p_coupon_id);

  IF v_notify_users IS NOT NULL THEN
    FOREACH v_notify_user_id IN ARRAY v_notify_users LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM public.notifications AS n
        WHERE n.user_id = v_notify_user_id
          AND n.type = 'system'
          AND n.title = '优惠券已失效'
          AND n.body = v_body
      ) THEN
        INSERT INTO public.notifications (
          user_id,
          actor_id,
          type,
          post_id,
          title,
          body
        ) VALUES (
          v_notify_user_id,
          v_user_id,
          'system',
          p_post_id,
          '优惠券已失效',
          v_body
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_mode;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_redeem_code(text) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';

COMMIT;
