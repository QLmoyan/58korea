-- 58korea search users/merchants V1 — idempotent
-- Apply with: npx tsx scripts/apply-search-users-merchants-v1.ts

BEGIN;

CREATE INDEX IF NOT EXISTS profiles_username_idx
  ON public.profiles (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_nickname_idx
  ON public.profiles (nickname);

CREATE INDEX IF NOT EXISTS merchant_profiles_business_name_idx
  ON public.merchant_profiles (business_name)
  WHERE is_active = true;

NOTIFY pgrst, 'reload schema';

COMMIT;
