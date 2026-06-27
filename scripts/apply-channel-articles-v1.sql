-- 58korea channel articles V1 — idempotent
-- Apply with: npx tsx scripts/apply-channel-articles-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  cover_url text,
  content_markdown text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT channel_articles_status_check
    CHECK (status IN ('draft', 'published', 'hidden'))
);

CREATE INDEX IF NOT EXISTS channels_active_sort_idx
  ON public.channels (sort_order ASC, created_at ASC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS channel_articles_channel_status_published_idx
  ON public.channel_articles (channel_id, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS channel_articles_status_published_at_idx
  ON public.channel_articles (status, published_at DESC);

DROP TRIGGER IF EXISTS channels_set_updated_at ON public.channels;
CREATE TRIGGER channels_set_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS channel_articles_set_updated_at ON public.channel_articles;
CREATE TRIGGER channel_articles_set_updated_at
  BEFORE UPDATE ON public.channel_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.channels (slug, name, description, sort_order, is_active)
VALUES
  ('korean-news', '韩国新闻', '韩国本地热点与华人关注资讯', 10, true),
  ('chinese-football', '华人足球', '韩国华人足球赛事与球队动态', 20, true),
  ('music-events', '音乐活动', '演出、音乐节与线下活动资讯', 30, true),
  ('official', '官方公告', '平台官方通知与重要公告', 40, true),
  ('beauty', '医美广告', '医美机构与合作推广内容', 50, true),
  ('business', '商家合作', '商家合作与品牌推广文章', 60, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_articles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.channels FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.channel_articles FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.channels FROM authenticated;
REVOKE ALL ON TABLE public.channel_articles FROM authenticated;

GRANT SELECT ON TABLE public.channels TO anon, authenticated;
GRANT SELECT ON TABLE public.channel_articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.channels TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.channel_articles TO authenticated;
GRANT ALL ON TABLE public.channels TO service_role;
GRANT ALL ON TABLE public.channel_articles TO service_role;

DROP POLICY IF EXISTS channels_select_active ON public.channels;
DROP POLICY IF EXISTS channels_admin_all ON public.channels;
DROP POLICY IF EXISTS channel_articles_select_published ON public.channel_articles;
DROP POLICY IF EXISTS channel_articles_admin_all ON public.channel_articles;
DROP POLICY IF EXISTS profiles_select_channel_article_authors ON public.profiles;

CREATE POLICY channels_select_active
  ON public.channels
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY channels_admin_all
  ON public.channels
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

CREATE POLICY channel_articles_select_published
  ON public.channel_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY channel_articles_admin_all
  ON public.channel_articles
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

CREATE POLICY profiles_select_channel_article_authors
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.channel_articles AS ca
      WHERE ca.author_id = profiles.id
        AND ca.status = 'published'
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
