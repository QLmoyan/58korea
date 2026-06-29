import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SquareBannerItem } from "@/lib/square/banners";

const BANNER_SELECT = "id, title, image_url, link_url";

export async function fetchActiveSquareBanners(): Promise<SquareBannerItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("square_banners")
    .select(BANNER_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
  }));
}
