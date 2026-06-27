"use server";

import type {
  CreateMerchantCouponInput,
  MerchantCoupon,
  UpdateMerchantCouponInput,
} from "@/lib/types/merchant-coupon";
import { normalizeRedeemCodeInput } from "@/lib/merchant/coupon-utils";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type DbMerchantCoupon = Database["public"]["Tables"]["merchant_coupons"]["Row"];

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

function validateCouponInput(input: {
  title: string;
  discountAmountKrw: number;
  totalQuantity: number;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("请填写优惠券标题");
  }

  if (!Number.isFinite(input.discountAmountKrw) || input.discountAmountKrw <= 0) {
    throw new Error("优惠金额必须大于 0");
  }

  if (!Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0) {
    throw new Error("发放数量必须为正整数");
  }

  if (input.startsAt && input.endsAt) {
    const start = new Date(input.startsAt).getTime();
    const end = new Date(input.endsAt).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      throw new Error("结束时间不能早于开始时间");
    }
  }

  return {
    title,
    discountAmountKrw: Math.round(input.discountAmountKrw),
    totalQuantity: input.totalQuantity,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
  };
}

export interface MerchantCouponMutationResult {
  coupon: MerchantCoupon;
}

export interface ClaimMerchantCouponResult {
  userCouponId: string;
  coupon: MerchantCoupon;
}

export interface RedeemUserCouponResult {
  userCouponId: string;
}

export async function createMerchantCouponAction(
  input: CreateMerchantCouponInput,
): Promise<MerchantCouponMutationResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const validated = validateCouponInput(input);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("merchant_coupons")
    .insert({
      merchant_id: input.merchantId,
      title: validated.title,
      discount_amount_krw: validated.discountAmountKrw,
      total_quantity: validated.totalQuantity,
      per_user_limit: 1,
      starts_at: validated.startsAt,
      ends_at: validated.endsAt,
      usage_note: input.usageNote?.trim() || null,
      is_active: input.isActive,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "创建优惠券失败");
  }

  return { coupon: mapMerchantCoupon(data) };
}

export async function updateMerchantCouponAction(
  input: UpdateMerchantCouponInput,
): Promise<MerchantCouponMutationResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const validated = validateCouponInput(input);
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("merchant_coupons")
    .select("claimed_quantity")
    .eq("id", input.couponId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (!existing) {
    throw new Error("优惠券不存在或无权编辑");
  }

  if (validated.totalQuantity < existing.claimed_quantity) {
    throw new Error("发放总量不能小于已领取数量");
  }

  const { data, error } = await supabase
    .from("merchant_coupons")
    .update({
      title: validated.title,
      discount_amount_krw: validated.discountAmountKrw,
      total_quantity: validated.totalQuantity,
      starts_at: validated.startsAt,
      ends_at: validated.endsAt,
      usage_note: input.usageNote?.trim() || null,
      is_active: input.isActive,
    })
    .eq("id", input.couponId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "更新优惠券失败");
  }

  return { coupon: mapMerchantCoupon(data) };
}

export async function claimMerchantCouponAction(
  couponId: string,
): Promise<ClaimMerchantCouponResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("claim_merchant_coupon", {
    p_coupon_id: couponId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("领取优惠券失败");
  }

  const { data: couponRow, error: couponError } = await supabase
    .from("merchant_coupons")
    .select("*")
    .eq("id", couponId)
    .single();

  if (couponError || !couponRow) {
    throw new Error(couponError?.message ?? "读取优惠券信息失败");
  }

  return { userCouponId: data, coupon: mapMerchantCoupon(couponRow) };
}

export async function redeemUserCouponAction(
  redeemCode: string,
): Promise<RedeemUserCouponResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const normalizedCode = normalizeRedeemCodeInput(redeemCode);
  if (!normalizedCode) {
    throw new Error("请输入核销码");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("redeem_user_coupon", {
    p_redeem_code: normalizedCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("核销失败");
  }

  return { userCouponId: data };
}
