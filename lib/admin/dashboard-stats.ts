import {
  DASHBOARD_TIMEZONE,
  daysAgoSeoulStartIso,
  startOfSeoulDayIso,
} from "@/lib/admin/dashboard/time-bounds";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminDashboardStats } from "@/lib/types/admin-dashboard";

async function exactCount(
  table:
    | "profiles"
    | "posts"
    | "comments"
    | "merchant_profiles"
    | "merchant_coupons"
    | "user_coupons"
    | "content_reports",
  filters?: (query: ReturnType<ReturnType<typeof getSupabaseAdminClient>["from"]>) => typeof query,
): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filters) {
    query = filters(query);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(`${table} count failed: ${error.message}`);
  }
  return count ?? 0;
}

async function collectColumnValues(
  table:
    | "post_views"
    | "posts"
    | "comments"
    | "post_likes"
    | "post_favorites"
    | "user_coupons",
  column: string,
  timeColumn: string,
  sinceIso: string,
  extraFilter?: (query: ReturnType<ReturnType<typeof getSupabaseAdminClient>["from"]>) => typeof query,
): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select(column)
      .gte(timeColumn, sinceIso)
      .range(from, from + pageSize - 1);

    if (extraFilter) {
      query = extraFilter(query);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}.${column} fetch failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      const record = row as unknown as Record<string, string | null | undefined>;
      const value = record[column];
      if (typeof value === "string" && value) {
        ids.add(value);
      }
    }

    if ((data ?? []).length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return ids;
}

async function collectLoginActiveUserIds(sinceIso: string): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const ids = new Set<string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(`auth listUsers failed: ${error.message}`);
    }

    for (const user of data.users) {
      if (user.last_sign_in_at && user.last_sign_in_at >= sinceIso) {
        ids.add(user.id);
      }
    }

    if (data.users.length < 1000) {
      break;
    }

    page += 1;
  }

  return ids;
}

async function collectUserCouponActiveUserIds(sinceIso: string): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("user_coupons")
      .select("user_id, claimed_at, redeemed_at")
      .or(`claimed_at.gte.${sinceIso},redeemed_at.gte.${sinceIso}`)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`user_coupons activity fetch failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.claimed_at && row.claimed_at >= sinceIso) {
        ids.add(row.user_id);
      }
      if (row.redeemed_at && row.redeemed_at >= sinceIso) {
        ids.add(row.user_id);
      }
    }

    if ((data ?? []).length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return ids;
}

async function countActiveUsers(sinceIso: string): Promise<number> {
  const [
    loginIds,
    viewIds,
    postAuthorIds,
    commentUserIds,
    likeIds,
    favoriteIds,
    couponUserIds,
  ] = await Promise.all([
    collectLoginActiveUserIds(sinceIso),
    collectColumnValues("post_views", "user_id", "viewed_at", sinceIso),
    collectColumnValues("posts", "author_id", "created_at", sinceIso, (query) =>
      query.not("author_id", "is", null),
    ),
    collectColumnValues("comments", "user_id", "created_at", sinceIso, (query) =>
      query.not("user_id", "is", null),
    ),
    collectColumnValues("post_likes", "user_id", "created_at", sinceIso),
    collectColumnValues("post_favorites", "user_id", "created_at", sinceIso),
    collectUserCouponActiveUserIds(sinceIso),
  ]);

  const active = new Set<string>();
  for (const bucket of [
    loginIds,
    viewIds,
    postAuthorIds,
    commentUserIds,
    likeIds,
    favoriteIds,
    couponUserIds,
  ]) {
    for (const id of bucket) {
      active.add(id);
    }
  }

  return active.size;
}

async function countActiveMerchantsToday(startOfTodayIso: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data: merchants, error: merchantError } = await supabase
    .from("merchant_profiles")
    .select("id, user_id");

  if (merchantError) {
    throw new Error(`merchant_profiles fetch failed: ${merchantError.message}`);
  }

  const merchantRows = merchants ?? [];
  if (merchantRows.length === 0) {
    return 0;
  }

  const merchantUserIds = merchantRows.map((row) => row.user_id);
  const activeMerchantIds = new Set<string>();

  const { data: postsToday, error: postsError } = await supabase
    .from("posts")
    .select("author_id")
    .gte("created_at", startOfTodayIso)
    .in("author_id", merchantUserIds);

  if (postsError) {
    throw new Error(`merchant posts today failed: ${postsError.message}`);
  }

  for (const row of postsToday ?? []) {
    if (row.author_id) {
      const merchant = merchantRows.find((item) => item.user_id === row.author_id);
      if (merchant) {
        activeMerchantIds.add(merchant.id);
      }
    }
  }

  const { data: coupons, error: couponsError } = await supabase
    .from("merchant_coupons")
    .select("id, merchant_id, created_at, updated_at")
    .gte("updated_at", startOfTodayIso);

  if (couponsError) {
    throw new Error(`merchant coupon activity failed: ${couponsError.message}`);
  }

  for (const coupon of coupons ?? []) {
    const edited =
      coupon.updated_at > coupon.created_at &&
      coupon.updated_at >= startOfTodayIso;
    if (edited) {
      activeMerchantIds.add(coupon.merchant_id);
    }
  }

  const { data: redemptions, error: redemptionError } = await supabase
    .from("user_coupons")
    .select("coupon_id, redeemed_at")
    .gte("redeemed_at", startOfTodayIso)
    .not("redeemed_at", "is", null);

  if (redemptionError) {
    throw new Error(`coupon redemption activity failed: ${redemptionError.message}`);
  }

  const couponIds = [...new Set((redemptions ?? []).map((row) => row.coupon_id))];
  if (couponIds.length > 0) {
    const { data: redeemedCoupons, error: redeemedCouponsError } = await supabase
      .from("merchant_coupons")
      .select("id, merchant_id")
      .in("id", couponIds);

    if (redeemedCouponsError) {
      throw new Error(
        `redeemed coupon lookup failed: ${redeemedCouponsError.message}`,
      );
    }

    for (const coupon of redeemedCoupons ?? []) {
      activeMerchantIds.add(coupon.merchant_id);
    }
  }

  return activeMerchantIds.size;
}

export async function computeAdminDashboardStats(
  reference = new Date(),
): Promise<AdminDashboardStats> {
  const startOfTodayIso = startOfSeoulDayIso(reference);
  const startOfWeekIso = daysAgoSeoulStartIso(7, reference);
  const startOfMonthIso = daysAgoSeoulStartIso(30, reference);

  const [
    totalUsers,
    newToday,
    dau,
    wau,
    mau,
    postsToday,
    commentsToday,
    merchantsTotal,
    merchantsCertified,
    merchantsActiveToday,
    couponsPublishedToday,
    couponsClaimedToday,
    couponsRedeemedToday,
    pendingReviewPosts,
    pendingReports,
  ] = await Promise.all([
    exactCount("profiles"),
    exactCount("profiles", (query) => query.gte("created_at", startOfTodayIso)),
    countActiveUsers(startOfTodayIso),
    countActiveUsers(startOfWeekIso),
    countActiveUsers(startOfMonthIso),
    exactCount("posts", (query) => query.gte("created_at", startOfTodayIso)),
    exactCount("comments", (query) => query.gte("created_at", startOfTodayIso)),
    exactCount("merchant_profiles"),
    exactCount("merchant_profiles", (query) => query.eq("is_active", true)),
    countActiveMerchantsToday(startOfTodayIso),
    exactCount("merchant_coupons", (query) =>
      query.gte("created_at", startOfTodayIso),
    ),
    exactCount("user_coupons", (query) =>
      query.gte("claimed_at", startOfTodayIso),
    ),
    exactCount("user_coupons", (query) =>
      query.gte("redeemed_at", startOfTodayIso).not("redeemed_at", "is", null),
    ),
    exactCount("posts", (query) =>
      query.eq("moderation_status", "pending_review"),
    ),
    exactCount("content_reports", (query) => query.eq("status", "open")),
  ]);

  return {
    generatedAt: reference.toISOString(),
    timezone: DASHBOARD_TIMEZONE,
    users: {
      total: totalUsers,
      newToday,
      dau,
      wau,
      mau,
    },
    content: {
      postsToday,
      commentsToday,
      searchesToday: null,
    },
    merchants: {
      total: merchantsTotal,
      certified: merchantsCertified,
      activeToday: merchantsActiveToday,
    },
    coupons: {
      publishedToday: couponsPublishedToday,
      claimedToday: couponsClaimedToday,
      redeemedToday: couponsRedeemedToday,
    },
    operations: {
      pendingReviewPosts,
      pendingReports,
    },
  };
}
