-- 韩圈 square banners V1 — idempotent
-- Apply with: npx tsx scripts/apply-square-banners-v1.ts

BEGIN;

CREATE TABLE IF NOT EXISTS public.square_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  image_url text NOT NULL,
  link_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS square_banners_active_sort_idx
  ON public.square_banners (sort_order ASC, created_at DESC)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS square_banners_set_updated_at ON public.square_banners;
CREATE TRIGGER square_banners_set_updated_at
  BEFORE UPDATE ON public.square_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.square_banners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.square_banners FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.square_banners FROM authenticated;

GRANT SELECT ON TABLE public.square_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.square_banners TO authenticated;
GRANT ALL ON TABLE public.square_banners TO service_role;

DROP POLICY IF EXISTS square_banners_select_active ON public.square_banners;
DROP POLICY IF EXISTS square_banners_admin_all ON public.square_banners;

CREATE POLICY square_banners_select_active
  ON public.square_banners
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY square_banners_admin_all
  ON public.square_banners
  FOR ALL
  TO authenticated
  USING (public.is_admin_member())
  WITH CHECK (public.is_admin_member());

NOTIFY pgrst, 'reload schema';

COMMIT;
