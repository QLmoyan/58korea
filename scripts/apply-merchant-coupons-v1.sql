-- 58korea merchant coupons V1 — idempotent
-- Apply with: npx tsx scripts/apply-merchant-coupons-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.merchant_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchant_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  discount_amount_krw integer NOT NULL CHECK (discount_amount_krw > 0),
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  claimed_quantity integer NOT NULL DEFAULT 0 CHECK (claimed_quantity >= 0),
  per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit = 1),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (claimed_quantity <= total_quantity),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS merchant_coupons_merchant_active_idx
  ON public.merchant_coupons (merchant_id, is_active, ends_at DESC);

CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.merchant_coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'used')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_coupons_user_claimed_idx
  ON public.user_coupons (user_id, claimed_at DESC);

DROP TRIGGER IF EXISTS merchant_coupons_set_updated_at ON public.merchant_coupons;

CREATE TRIGGER merchant_coupons_set_updated_at
  BEFORE UPDATE ON public.merchant_coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

  UPDATE public.merchant_coupons
  SET claimed_quantity = claimed_quantity + 1,
      updated_at = now()
  WHERE id = p_coupon_id;

  INSERT INTO public.user_coupons (coupon_id, user_id, status)
  VALUES (p_coupon_id, v_user_id, 'claimed')
  RETURNING id INTO v_user_coupon_id;

  RETURN v_user_coupon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_merchant_coupon(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_merchant_coupon(uuid) TO authenticated;

ALTER TABLE public.merchant_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.merchant_coupons FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.merchant_coupons FROM authenticated;
REVOKE ALL ON TABLE public.user_coupons FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.user_coupons FROM authenticated;

GRANT SELECT ON TABLE public.merchant_coupons TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.merchant_coupons TO authenticated;
GRANT ALL ON TABLE public.merchant_coupons TO service_role;

GRANT SELECT ON TABLE public.user_coupons TO authenticated;
GRANT ALL ON TABLE public.user_coupons TO service_role;

DROP POLICY IF EXISTS merchant_coupons_select_public_active ON public.merchant_coupons;
DROP POLICY IF EXISTS merchant_coupons_select_merchant_own ON public.merchant_coupons;
DROP POLICY IF EXISTS merchant_coupons_select_claimed_by_user ON public.merchant_coupons;
DROP POLICY IF EXISTS merchant_coupons_insert_merchant_own ON public.merchant_coupons;
DROP POLICY IF EXISTS merchant_coupons_update_merchant_own ON public.merchant_coupons;
DROP POLICY IF EXISTS merchant_coupons_admin_all ON public.merchant_coupons;

CREATE POLICY merchant_coupons_select_public_active
  ON public.merchant_coupons
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY merchant_coupons_select_merchant_own
  ON public.merchant_coupons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_profiles AS mp
      WHERE mp.id = merchant_id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY merchant_coupons_select_claimed_by_user
  ON public.merchant_coupons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_coupons AS uc
      WHERE uc.coupon_id = id
        AND uc.user_id = auth.uid()
    )
  );

CREATE POLICY merchant_coupons_insert_merchant_own
  ON public.merchant_coupons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    per_user_limit = 1
    AND EXISTS (
      SELECT 1
      FROM public.merchant_profiles AS mp
      WHERE mp.id = merchant_id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY merchant_coupons_update_merchant_own
  ON public.merchant_coupons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_profiles AS mp
      WHERE mp.id = merchant_id
        AND mp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    per_user_limit = 1
    AND EXISTS (
      SELECT 1
      FROM public.merchant_profiles AS mp
      WHERE mp.id = merchant_id
        AND mp.user_id = auth.uid()
    )
  );

CREATE POLICY merchant_coupons_admin_all
  ON public.merchant_coupons
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

DROP POLICY IF EXISTS user_coupons_select_own ON public.user_coupons;
DROP POLICY IF EXISTS user_coupons_admin_all ON public.user_coupons;

CREATE POLICY user_coupons_select_own
  ON public.user_coupons
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_coupons_admin_all
  ON public.user_coupons
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

NOTIFY pgrst, 'reload schema';

COMMIT;
