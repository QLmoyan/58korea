-- 58korea profile edit V1 — idempotent
-- Apply with: npx tsx scripts/apply-profile-edit-v1.ts

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check
  CHECK (
    gender IS NULL
    OR gender IN ('男', '女', '保密')
  );

COMMIT;
