-- 58korea coupon lifecycle V1 — delete/invalidate + per-claim expiry + reminders
-- Apply with: npx tsx scripts/apply-coupon-lifecycle-v1.ts

BEGIN;

ALTER TABLE public.user_coupons
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

ALTER TABLE public.user_coupons
  DROP CONSTRAINT IF EXISTS user_coupons_status_check;

ALTER TABLE public.user_coupons
  ADD CONSTRAINT user_coupons_status_check
  CHECK (status IN ('claimed', 'used', 'cancelled', 'expired'));

UPDATE public.user_coupons AS uc
SET expires_at = mc.ends_at
FROM public.merchant_coupons AS mc
WHERE mc.id = uc.coupon_id
  AND uc.expires_at IS NULL
  AND mc.ends_at IS NOT NULL;

UPDATE public.user_coupons
SET status = 'expired'
WHERE status = 'claimed'
  AND expires_at IS NOT NULL
  AND expires_at <= now();

CREATE INDEX IF NOT EXISTS user_coupons_expiry_reminder_idx
  ON public.user_coupons (expires_at)
  WHERE status = 'claimed' AND reminded_at IS NULL;

CREATE OR REPLACE FUNCTION public.invalidate_merchant_coupon_claims(p_coupon_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_coupons
  SET status = 'cancelled'
  WHERE coupon_id = p_coupon_id
    AND status = 'claimed';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_or_delete_merchant_coupon(p_coupon_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.merchant_coupons%ROWTYPE;
BEGIN
  SELECT *
  INTO v_coupon
  FROM public.merchant_coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'missing';
  END IF;

  PERFORM public.invalidate_merchant_coupon_claims(p_coupon_id);

  IF v_coupon.claimed_quantity = 0 THEN
    DELETE FROM public.merchant_coupons
    WHERE id = p_coupon_id;
    RETURN 'deleted';
  END IF;

  UPDATE public.merchant_coupons
  SET is_active = false,
      updated_at = now()
  WHERE id = p_coupon_id;

  RETURN 'deactivated';
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

  UPDATE public.posts
  SET linked_coupon_id = NULL
  WHERE id = p_post_id
    AND linked_coupon_id = p_coupon_id;

  v_mode := public.deactivate_or_delete_merchant_coupon(p_coupon_id);
  RETURN v_mode;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_owned_post(p_post_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post public.posts%ROWTYPE;
  v_coupon_id uuid;
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
    RAISE EXCEPTION '无权删除该帖子';
  END IF;

  v_coupon_id := v_post.linked_coupon_id;

  IF v_coupon_id IS NOT NULL THEN
    PERFORM public.deactivate_or_delete_merchant_coupon(v_coupon_id);
  END IF;

  DELETE FROM public.posts
  WHERE id = p_post_id
    AND author_id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_expired_user_coupons()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.user_coupons
  SET status = 'expired'
  WHERE status = 'claimed'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_expiring_coupon_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_count integer := 0;
  v_body text;
BEGIN
  PERFORM public.mark_expired_user_coupons();

  FOR v_row IN
    SELECT
      uc.id,
      uc.user_id,
      mc.title,
      mc.discount_amount_krw,
      uc.expires_at
    FROM public.user_coupons AS uc
    JOIN public.merchant_coupons AS mc ON mc.id = uc.coupon_id
    WHERE uc.status = 'claimed'
      AND uc.expires_at IS NOT NULL
      AND uc.expires_at > now()
      AND uc.expires_at <= now() + interval '1 hour'
      AND uc.reminded_at IS NULL
    FOR UPDATE OF uc
  LOOP
    v_body := format(
      '您领取的「%s」（%s韩元）将在 %s 到期，请尽快使用。',
      v_row.title,
      v_row.discount_amount_krw,
      to_char(v_row.expires_at AT TIME ZONE 'Asia/Seoul', 'MM-DD HH24:MI')
    );

    INSERT INTO public.notifications (
      user_id,
      actor_id,
      type,
      post_id,
      title,
      body
    ) VALUES (
      v_row.user_id,
      NULL,
      'system',
      NULL,
      '您有一张优惠券即将到期',
      v_body
    );

    UPDATE public.user_coupons
    SET reminded_at = now()
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_merchant_coupon(p_coupon_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_coupon public.merchant_coupons%ROWTYPE;
  v_user_coupon_id uuid;
  v_redeem_code text;
  v_attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  SELECT *
  INTO v_coupon
  FROM public.merchant_coupons
  WHERE id = p_coupon_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '优惠券不存在';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION '优惠券已停用';
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN
    RAISE EXCEPTION '优惠券尚未开始';
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RAISE EXCEPTION '优惠券已过期';
  END IF;

  IF v_coupon.claimed_quantity >= v_coupon.total_quantity THEN
    RAISE EXCEPTION '优惠券已领完';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_coupons uc
    WHERE uc.coupon_id = p_coupon_id
      AND uc.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION '您已领取过该优惠券';
  END IF;

  LOOP
    v_redeem_code := public.generate_redeem_code();
    v_attempts := v_attempts + 1;
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.user_coupons
      WHERE redeem_code = v_redeem_code
    );
    IF v_attempts > 20 THEN
      RAISE EXCEPTION '生成核销码失败，请稍后重试';
    END IF;
  END LOOP;

  UPDATE public.merchant_coupons
  SET claimed_quantity = claimed_quantity + 1,
      updated_at = now()
  WHERE id = p_coupon_id;

  INSERT INTO public.user_coupons (
    coupon_id,
    user_id,
    status,
    redeem_code,
    expires_at
  )
  VALUES (
    p_coupon_id,
    v_user_id,
    'claimed',
    v_redeem_code,
    v_coupon.ends_at
  )
  RETURNING id INTO v_user_coupon_id;

  RETURN v_user_coupon_id;
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
  v_normalized_code text := upper(trim(p_redeem_code));
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
    RAISE EXCEPTION '优惠券已失效，无法核销';
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

REVOKE ALL ON FUNCTION public.invalidate_merchant_coupon_claims(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_or_delete_merchant_coupon(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_post_linked_coupon(bigint, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_owned_post(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_expired_user_coupons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_expiring_coupon_reminders() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.remove_post_linked_coupon(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_owned_post(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_or_delete_merchant_coupon(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_expired_user_coupons() TO service_role;
GRANT EXECUTE ON FUNCTION public.process_expiring_coupon_reminders() TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
