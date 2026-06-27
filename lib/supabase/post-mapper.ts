import type { Post, PostCategory, PostDistance, PostImage, PostLinkedCouponSummary } from "@/lib/data/posts";
import type { Database } from "@/lib/supabase/database.types";

type DbPost = Database["public"]["Tables"]["posts"]["Row"];
type DbMerchantCoupon = Database["public"]["Tables"]["merchant_coupons"]["Row"];
type DbPostImagePartial = Pick<
  Database["public"]["Tables"]["post_images"]["Row"],
  "id" | "public_url" | "sort_order" | "width" | "height"
>;
type DbAuthorProfilePartial = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "username"
>;

export type DbPostWithRelations = DbPost & {
  post_images?: DbPostImagePartial[];
  linked_coupon?: DbMerchantCoupon | DbMerchantCoupon[] | null;
  author_profile?: DbAuthorProfilePartial | DbAuthorProfilePartial[] | null;
};

export function mapLinkedCouponSummary(
  row: DbMerchantCoupon | null | undefined,
): PostLinkedCouponSummary | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    discountAmountKrw: row.discount_amount_krw,
    totalQuantity: row.total_quantity,
    claimedQuantity: row.claimed_quantity,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    usageNote: row.usage_note,
    isActive: row.is_active,
  };
}

function resolveLinkedCouponRow(
  row: DbPostWithRelations,
): DbMerchantCoupon | null {
  const linked = row.linked_coupon;
  if (!linked) {
    return null;
  }

  return Array.isArray(linked) ? linked[0] ?? null : linked;
}

function resolveAuthorUsername(row: DbPostWithRelations): string | null {
  const profile = row.author_profile;
  if (!profile) {
    return null;
  }

  const username = Array.isArray(profile)
    ? profile[0]?.username
    : profile.username;
  return username?.trim() || null;
}

export function mapPostRow(row: DbPostWithRelations, images?: PostImage[]): Post {
  const resolvedImages =
    images ??
    (row.post_images ?? [])
      .map((image) => ({
        id: image.id,
        url: image.public_url,
        sortOrder: image.sort_order,
        width: image.width,
        height: image.height,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const coverUrl = row.image_url ?? resolvedImages[0]?.url ?? null;
  const coverHeight = row.image_height ?? resolvedImages[0]?.height ?? null;
  const linkedCoupon = mapLinkedCouponSummary(resolveLinkedCouponRow(row));

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    authorId: row.author_id,
    authorUsername: resolveAuthorUsername(row),
    location: row.location,
    distance: row.distance as PostDistance,
    likes: row.likes,
    category: row.category as PostCategory,
    imageUrl: coverUrl,
    imageHeight: coverHeight,
    nearby: row.nearby,
    following: row.following,
    createdAt: row.created_at,
    images: resolvedImages.length > 0 ? resolvedImages : undefined,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    linkedCouponId: row.linked_coupon_id,
    linkedCoupon,
  };
}

export const POST_AUTHOR_PROFILE_SELECT =
  "author_profile:profiles!posts_author_id_fkey(username)";

export const POST_SELECT_WITH_LINKED_COUPON =
  `*, post_images(id, public_url, sort_order, width, height), ${POST_AUTHOR_PROFILE_SELECT}, linked_coupon:merchant_coupons!posts_linked_coupon_id_fkey(id, title, discount_amount_krw, total_quantity, claimed_quantity, starts_at, ends_at, usage_note, is_active, merchant_id, per_user_limit, created_at, updated_at)`;

export const POST_SELECT_WITH_LINKED_COUPON_SINGLE =
  `*, ${POST_AUTHOR_PROFILE_SELECT}, linked_coupon:merchant_coupons!posts_linked_coupon_id_fkey(id, title, discount_amount_krw, total_quantity, claimed_quantity, starts_at, ends_at, usage_note, is_active, merchant_id, per_user_limit, created_at, updated_at)`;

export const POST_SELECT_FOR_PROFILE_FEED =
  `*, post_images(id, public_url, sort_order, width, height), ${POST_AUTHOR_PROFILE_SELECT}`;
