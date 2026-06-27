-- 58korea AI auto category V1 — idempotent
-- Apply with: npx tsx scripts/apply-ai-category-v1.ts

BEGIN;

UPDATE public.posts SET category = '房屋' WHERE category = '住房';
UPDATE public.posts SET category = '其他' WHERE category = '搭子';

ALTER TABLE public.posts ALTER COLUMN category SET DEFAULT '其他';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS category_source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS ai_category_confidence numeric;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS ai_category_reason text;

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_source_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_source_check
  CHECK (category_source IN ('manual', 'ai', 'ai_fallback'));

COMMIT;
