import { normalizeUsername } from "@/lib/auth/username";
import { SITE_NAME } from "@/lib/share/constants";
import {
  mapPostRow,
  POST_SELECT_WITH_LINKED_COUPON_SINGLE,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_SELECT = "id, nickname, username, bio";

export async function fetchPublishedPostForMetadata(postId: number) {
  if (!Number.isFinite(postId)) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON_SINGLE)
    .eq("id", postId)
    .eq("moderation_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapPostRow(data as DbPostWithRelations);
}

export async function fetchPublicProfileForMetadata(username: string) {
  const normalized = normalizeUsername(username);
  const supabase = await createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("username", normalized)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  let merchant: {
    business_name: string;
    description: string | null;
    is_active: boolean;
  } | null = null;

  if (profile?.id) {
    const { data: merchantRow, error: merchantError } = await supabase
      .from("merchant_profiles")
      .select("business_name, description, is_active")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .eq("is_verified", true)
      .maybeSingle();

    if (merchantError) {
      throw new Error(merchantError.message);
    }

    merchant = merchantRow;
  }

  if (!profile && !merchant) {
    return null;
  }

  const displayName =
    merchant?.business_name?.trim() ||
    profile?.nickname?.trim() ||
    normalized;
  const description =
    merchant?.description?.trim() ||
    profile?.bio?.trim() ||
    `${displayName} 的${SITE_NAME}主页`;
  const isMerchant = Boolean(merchant?.is_active);

  return {
    username: normalized,
    displayName,
    description,
    isMerchant,
  };
}
