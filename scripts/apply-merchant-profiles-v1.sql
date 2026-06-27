-- 58korea merchant profiles V1 — idempotent
-- Apply with: npx tsx scripts/apply-merchant-profiles-v1.ts

BEGIN;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS posts_author_id_created_at_idx
  ON public.posts (author_id, created_at DESC)
  WHERE author_id IS NOT NULL;

UPDATE public.posts AS po
SET author_id = p.id
FROM public.profiles AS p
WHERE po.author_id IS NULL
  AND p.nickname = po.author;

CREATE TABLE IF NOT EXISTS public.merchant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  logo_url text,
  description text,
  address text,
  phone text,
  business_hours text,
  navigation_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS merchant_profiles_active_idx
  ON public.merchant_profiles (is_active)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.is_admin_member()
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
      AND role IN ('owner', 'admin')
  );
$$;

DROP TRIGGER IF EXISTS merchant_profiles_set_updated_at ON public.merchant_profiles;

CREATE TRIGGER merchant_profiles_set_updated_at
  BEFORE UPDATE ON public.merchant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.merchant_profiles (
  user_id,
  business_name,
  description,
  address,
  phone,
  business_hours,
  navigation_url,
  is_active
)
SELECT
  p.id,
  '全大胆',
  '韩国华人生活社区认证商家，提供留学咨询与本地生活服务。',
  '首尔',
  '',
  '周一至周五 10:00-19:00',
  '/merchant-navigation?merchant=全大胆&location=首尔',
  true
FROM public.profiles AS p
WHERE lower(p.username) = 'ql860430'
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.posts AS po
SET author_id = p.id
FROM public.profiles AS p
WHERE po.author = '全大胆'
  AND lower(p.username) = 'ql860430'
  AND (po.author_id IS NULL OR po.author_id <> p.id);

ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.merchant_profiles FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.merchant_profiles FROM authenticated;

GRANT SELECT ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.merchant_profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.merchant_profiles TO authenticated;
GRANT ALL ON TABLE public.merchant_profiles TO service_role;

DROP POLICY IF EXISTS profiles_select_public_merchants ON public.profiles;
DROP POLICY IF EXISTS merchant_profiles_select_active ON public.merchant_profiles;
DROP POLICY IF EXISTS merchant_profiles_select_own ON public.merchant_profiles;
DROP POLICY IF EXISTS merchant_profiles_update_own ON public.merchant_profiles;
DROP POLICY IF EXISTS merchant_profiles_admin_all ON public.merchant_profiles;

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
    )
  );

CREATE POLICY merchant_profiles_select_active
  ON public.merchant_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY merchant_profiles_select_own
  ON public.merchant_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY merchant_profiles_update_own
  ON public.merchant_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY merchant_profiles_admin_all
  ON public.merchant_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

NOTIFY pgrst, 'reload schema';

COMMIT;
