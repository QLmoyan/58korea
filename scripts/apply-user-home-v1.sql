-- 58korea unified user home V1 — idempotent
-- Apply with: npx tsx scripts/apply-user-home-v1.ts

BEGIN;

DROP POLICY IF EXISTS profiles_select_public_profiles ON public.profiles;

CREATE POLICY profiles_select_public_profiles
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    username IS NOT NULL
    AND btrim(username) <> ''
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
