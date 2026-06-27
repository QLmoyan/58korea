-- 58korea coupon redemption V1 — idempotent
-- Apply with: npx tsx scripts/apply-coupon-redemption-v1.ts

BEGIN;

ALTER TABLE public.user_coupons
  ADD COLUMN IF NOT EXISTS redeem_code text,
  ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz;

CREATE OR REPLACE FUNCTION public.generate_redeem_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  chars constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

DO $$
DECLARE
  row_record record;
  next_code text;
  attempts integer;
BEGIN
  FOR row_record IN
    SELECT id
    FROM public.user_coupons
    WHERE redeem_code IS NULL
  LOOP
    attempts := 0;
    LOOP
      next_code := public.generate_redeem_code();
      attempts := attempts + 1;
      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.user_coupons
        WHERE redeem_code = next_code
      );
      IF attempts > 20 THEN
        RAISE EXCEPTION 'failed to backfill redeem_code for user_coupon %', row_record.id;
      END IF;
    END LOOP;

    UPDATE public.user_coupons
    SET redeem_code = next_code
    WHERE id = row_record.id;
  END LOOP;
END;
$$;

ALTER TABLE public.user_coupons
  ALTER COLUMN redeem_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_coupons_redeem_code_idx
  ON public.user_coupons (redeem_code);

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

  INSERT INTO public.user_coupons (coupon_id, user_id, status, redeem_code)
  VALUES (p_coupon_id, v_user_id, 'claimed', v_redeem_code)
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

  IF v_user_coupon.status <> 'claimed' THEN
    RAISE EXCEPTION '该优惠券已核销';
  END IF;

  SELECT mc.*
  INTO v_coupon
  FROM public.merchant_coupons mc
  WHERE mc.id = v_user_coupon.coupon_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '优惠券不存在';
  END IF;

  IF NOT v_coupon.is_active THEN
    RAISE EXCEPTION '优惠券已停用';
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND now() > v_coupon.ends_at THEN
    RAISE EXCEPTION '优惠券已过期';
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

REVOKE ALL ON FUNCTION public.generate_redeem_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_merchant_coupon(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_user_coupon(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.claim_merchant_coupon(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_user_coupon(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
