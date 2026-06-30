-- 58korea merchant applications V1 — idempotent
-- Apply with: npx tsx scripts/apply-merchant-applications-v1.ts

BEGIN;

ALTER TABLE public.merchant_profiles
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

UPDATE public.merchant_profiles
SET is_verified = true
WHERE is_active = true
  AND is_verified = false;

CREATE TABLE IF NOT EXISTS public.merchant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  category text NOT NULL,
  address text NOT NULL,
  contact text NOT NULL,
  proof_note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_applications_user_id_created_at_idx
  ON public.merchant_applications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS merchant_applications_one_pending_per_user_idx
  ON public.merchant_applications (user_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.is_staff_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND enabled = true
  );
$$;

DROP TRIGGER IF EXISTS merchant_applications_set_updated_at ON public.merchant_applications;

CREATE TRIGGER merchant_applications_set_updated_at
  BEFORE UPDATE ON public.merchant_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.merchant_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.merchant_applications FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.merchant_applications FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.merchant_applications TO authenticated;
GRANT ALL ON TABLE public.merchant_applications TO service_role;

DROP POLICY IF EXISTS merchant_applications_select_own ON public.merchant_applications;
DROP POLICY IF EXISTS merchant_applications_select_staff ON public.merchant_applications;
DROP POLICY IF EXISTS merchant_applications_insert_own ON public.merchant_applications;
DROP POLICY IF EXISTS merchant_applications_admin_update ON public.merchant_applications;
DROP POLICY IF EXISTS merchant_applications_admin_all ON public.merchant_applications;

CREATE POLICY merchant_applications_select_own
  ON public.merchant_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY merchant_applications_select_staff
  ON public.merchant_applications
  FOR SELECT
  TO authenticated
  USING (public.is_staff_member());

CREATE POLICY merchant_applications_insert_own
  ON public.merchant_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND reject_reason IS NULL
  );

CREATE POLICY merchant_applications_admin_update
  ON public.merchant_applications
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

DROP POLICY IF EXISTS merchant_profiles_select_active ON public.merchant_profiles;

CREATE POLICY merchant_profiles_select_active
  ON public.merchant_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_verified = true);

DROP POLICY IF EXISTS profiles_select_public_merchants ON public.profiles;

CREATE POLICY profiles_select_public_merchants
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.merchant_profiles AS mp
      WHERE mp.user_id = profiles.id
        AND mp.is_active = true
        AND mp.is_verified = true
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
