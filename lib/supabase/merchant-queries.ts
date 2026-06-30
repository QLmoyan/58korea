import type { MerchantProfile, MerchantSummary } from "@/lib/types/merchant";
import { normalizeUsername } from "@/lib/auth/username";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import {
  MERCHANT_AUTHOR_NAME,
  MERCHANT_USERNAME,
  isVerifiedMerchantAccount,
} from "@/lib/merchant/identify";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Post, PostCategory, PostDistance } from "@/lib/data/posts";
import {
  mapPostRow,
  POST_SELECT_WITH_LINKED_COUPON,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";

type DbMerchantProfile = Database["public"]["Tables"]["merchant_profiles"]["Row"];
type DbProfile = Database["public"]["Tables"]["profiles"]["Row"];
type DbPost = Database["public"]["Tables"]["posts"]["Row"];

const PUBLIC_MERCHANT_PROFILE_SELECT =
  "id, user_id, business_name, category, logo_url, description, address, phone, business_hours, navigation_url, is_active, is_verified, created_at, updated_at";

type MerchantProfileRow = DbMerchantProfile & {
  profiles: Pick<DbProfile, "username" | "nickname"> | null;
};

function mapMerchantProfile(row: MerchantProfileRow): MerchantProfile {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.profiles?.username ?? null,
    businessName: row.business_name,
    category: row.category ?? null,
    logoUrl: row.logo_url,
    description: row.description,
    address: row.address,
    phone: row.phone,
    businessHours: row.business_hours,
    navigationUrl: row.navigation_url,
    isActive: row.is_active,
    isVerified: row.is_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMerchantSummary(row: MerchantProfileRow): MerchantSummary | null {
  const username = row.profiles?.username?.trim();
  if (!username) {
    return null;
  }

  return {
    merchantProfileId: row.id,
    userId: row.user_id,
    username: normalizeUsername(username),
    businessName: row.business_name,
    authorName: row.profiles?.nickname ?? null,
  };
}

function mapPost(row: DbPost): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    authorId: row.author_id,
    location: row.location,
    distance: row.distance as PostDistance,
    likes: row.likes,
    category: row.category as PostCategory,
    imageUrl: row.image_url,
    imageHeight: row.image_height,
    nearby: row.nearby,
    following: row.following,
    createdAt: row.created_at,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    linkedCouponId: row.linked_coupon_id,
  };
}

export async function fetchActiveMerchantSummaries(): Promise<MerchantSummary[]> {
  const supabase = getSupabaseClient();
  const { data: merchants, error } = await supabase
    .from("merchant_profiles")
    .select("id, user_id, business_name")
    .eq("is_active", true)
    .eq("is_verified", true);

  if (error) {
    throw new Error(error.message);
  }

  if (!merchants?.length) {
    return [];
  }

  const userIds = merchants.map((merchant) => merchant.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, nickname")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return merchants
    .map((merchant) => {
      const profile = profileById.get(merchant.user_id);
      const username = profile?.username?.trim();
      if (!username) {
        return null;
      }

      return {
        merchantProfileId: merchant.id,
        userId: merchant.user_id,
        username: normalizeUsername(username),
        businessName: merchant.business_name,
        authorName: profile?.nickname ?? null,
      } satisfies MerchantSummary;
    })
    .filter((item): item is MerchantSummary => Boolean(item));
}

export async function fetchMerchantProfileByUsername(
  username: string,
): Promise<MerchantProfile | null> {
  const normalized = normalizeUsername(username);
  const supabase = getSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, nickname")
    .eq("username", normalized)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("merchant_profiles")
    .select(PUBLIC_MERCHANT_PROFILE_SELECT)
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .eq("is_verified", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapMerchantProfile({
    ...data,
    phone: null,
    profiles: {
      username: profile.username,
      nickname: profile.nickname,
    },
  });
}

export async function fetchMerchantProfileByUserId(
  userId: string,
): Promise<MerchantProfile | null> {
  const supabase = getSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, nickname")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("merchant_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.is_active || !data.is_verified) {
    return null;
  }

  return mapMerchantProfile({
    ...data,
    profiles: {
      username: profile.username,
      nickname: profile.nickname,
    },
  });
}

export async function fetchPublishedPostsByAuthorId(
  authorId: string,
): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON)
    .eq("author_id", authorId)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPostRow(row as DbPostWithRelations));
}

export function resolveMerchantForPost(
  post: { author: string; authorId?: string | null },
  merchants: MerchantSummary[],
): MerchantSummary | null {
  if (post.authorId) {
    const byId = merchants.find((merchant) => merchant.userId === post.authorId);
    if (byId) {
      return byId;
    }
  }

  const byAuthor = merchants.find(
    (merchant) => merchant.authorName?.trim() === post.author.trim(),
  );
  if (byAuthor) {
    return byAuthor;
  }

  if (
    isVerifiedMerchantAccount({
      author: post.author,
    })
  ) {
    return {
      merchantProfileId: "",
      userId: "",
      username: MERCHANT_USERNAME,
      businessName: MERCHANT_AUTHOR_NAME,
      authorName: MERCHANT_AUTHOR_NAME,
    };
  }

  return null;
}

export function buildMerchantHomeHref(username: string): string {
  return buildPublicProfileHref(username);
}
