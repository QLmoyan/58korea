"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BANNER_SELECT =
  "id, title, image_url, link_url, sort_order, is_active, created_at, updated_at";

export interface AdminSquareBannerItem {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveSquareBannerInput {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function listAdminSquareBannersAction(): Promise<AdminSquareBannerItem[]> {
  await assertAdminPermission("channel_articles.read");
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("square_banners")
    .select(BANNER_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdminSquareBannerItem[];
}

export async function createSquareBannerAction(
  input: SaveSquareBannerInput,
): Promise<AdminSquareBannerItem> {
  await assertAdminPermission("channel_articles.write");
  const title = input.title.trim();
  const imageUrl = input.imageUrl.trim();
  const linkUrl = input.linkUrl?.trim() || null;

  if (!title) {
    throw new Error("请填写标题");
  }
  if (!imageUrl) {
    throw new Error("请填写图片 URL");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("square_banners")
    .insert({
      title,
      image_url: imageUrl,
      link_url: linkUrl,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select(BANNER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminSquareBannerItem;
}

export async function updateSquareBannerAction(
  bannerId: string,
  input: SaveSquareBannerInput,
): Promise<AdminSquareBannerItem> {
  await assertAdminPermission("channel_articles.write");
  const title = input.title.trim();
  const imageUrl = input.imageUrl.trim();
  const linkUrl = input.linkUrl?.trim() || null;

  if (!title) {
    throw new Error("请填写标题");
  }
  if (!imageUrl) {
    throw new Error("请填写图片 URL");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("square_banners")
    .update({
      title,
      image_url: imageUrl,
      link_url: linkUrl,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .eq("id", bannerId)
    .select(BANNER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminSquareBannerItem;
}

export async function setSquareBannerActiveAction(
  bannerId: string,
  isActive: boolean,
): Promise<AdminSquareBannerItem> {
  await assertAdminPermission("channel_articles.write");
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("square_banners")
    .update({ is_active: isActive })
    .eq("id", bannerId)
    .select(BANNER_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdminSquareBannerItem;
}

export async function deleteSquareBannerAction(bannerId: string) {
  await assertAdminPermission("channel_articles.write");
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("square_banners")
    .delete()
    .eq("id", bannerId);

  if (error) {
    throw new Error(error.message);
  }
}
