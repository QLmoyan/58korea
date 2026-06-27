import {
  getUserCouponDisplayStatus,
  isCouponPubliclyVisible,
} from "@/lib/merchant/coupon-utils";
import type {
  MerchantCoupon,
  UserCouponWithDetails,
} from "@/lib/types/merchant-coupon";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type DbMerchantCoupon = Database["public"]["Tables"]["merchant_coupons"]["Row"];
type DbUserCoupon = Database["public"]["Tables"]["user_coupons"]["Row"];

function mapMerchantCoupon(row: DbMerchantCoupon): MerchantCoupon {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    title: row.title,
    discountAmountKrw: row.discount_amount_krw,
    totalQuantity: row.total_quantity,
    claimedQuantity: row.claimed_quantity,
    perUserLimit: row.per_user_limit,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    usageNote: row.usage_note,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchCouponsByMerchantId(
  merchantId: string,
  options?: { publicOnly?: boolean },
): Promise<MerchantCoupon[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("merchant_coupons")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const coupons = (data ?? []).map(mapMerchantCoupon);

  if (options?.publicOnly) {
    return coupons.filter((coupon) => isCouponPubliclyVisible(coupon));
  }

  return coupons;
}

export async function fetchUserClaimedCouponIds(
  userId: string,
  couponIds: string[],
): Promise<Set<string>> {
  if (couponIds.length === 0) {
    return new Set();
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_coupons")
    .select("coupon_id")
    .eq("user_id", userId)
    .in("coupon_id", couponIds)
    .in("status", ["claimed", "used"]);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.coupon_id));
}

export async function fetchUserCouponsWithDetails(
  userId: string,
): Promise<UserCouponWithDetails[]> {
  const supabase = getSupabaseClient();
  const { data: userCoupons, error: userCouponsError } = await supabase
    .from("user_coupons")
    .select("*")
    .eq("user_id", userId)
    .order("claimed_at", { ascending: false });

  if (userCouponsError) {
    throw new Error(userCouponsError.message);
  }

  if (!userCoupons?.length) {
    return [];
  }

  const couponIds = userCoupons.map((row) => row.coupon_id);
  const { data: coupons, error: couponsError } = await supabase
    .from("merchant_coupons")
    .select("*")
    .in("id", couponIds);

  if (couponsError) {
    throw new Error(couponsError.message);
  }

  const couponById = new Map((coupons ?? []).map((row) => [row.id, row]));
  const merchantIds = [
    ...new Set(
      (coupons ?? [])
        .map((row) => row.merchant_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const { data: merchants, error: merchantsError } = await supabase
    .from("merchant_profiles")
    .select("id, business_name")
    .in("id", merchantIds);

  if (merchantsError) {
    throw new Error(merchantsError.message);
  }

  const merchantNameById = new Map(
    (merchants ?? []).map((row) => [row.id, row.business_name]),
  );

  const results: UserCouponWithDetails[] = [];

  for (const row of userCoupons as DbUserCoupon[]) {
    const coupon = couponById.get(row.coupon_id);
    if (!coupon) {
      continue;
    }

    const status = row.status as UserCouponWithDetails["status"];
    const expiresAt = row.expires_at ?? coupon.ends_at;

    results.push({
      id: row.id,
      couponId: row.coupon_id,
      userId: row.user_id,
      status,
      claimedAt: row.claimed_at,
      usedAt: row.used_at,
      expiresAt,
      redeemCode: row.redeem_code,
      redeemedAt: row.redeemed_at,
      displayStatus: getUserCouponDisplayStatus({
        status,
        expiresAt: row.expires_at,
        endsAt: coupon.ends_at,
        couponIsActive: coupon.is_active,
      }),
      merchantName: merchantNameById.get(coupon.merchant_id) ?? "商家",
      title: coupon.title,
      discountAmountKrw: coupon.discount_amount_krw,
      endsAt: expiresAt,
      couponIsActive: coupon.is_active,
      usageNote: coupon.usage_note,
    });
  }

  return results;
}

export function splitUserCouponsByUsability(coupons: UserCouponWithDetails[]) {
  const usable = coupons.filter((coupon) => coupon.displayStatus === "unused");
  const inactive = coupons.filter((coupon) => coupon.displayStatus !== "unused");
  return { usable, inactive };
}
