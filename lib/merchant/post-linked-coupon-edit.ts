import {
  combineSeoulDateTime,
  validateHHmm,
} from "@/lib/merchant/coupon-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PostLinkedCouponEditInput {
  discountAmountKrw: number;
  totalQuantity: number;
  startsDate: string;
  startsTime: string;
  endsDate: string;
  endsTime: string;
  usageNote: string;
  isActive: boolean;
}

function validateEditInput(input: PostLinkedCouponEditInput) {
  if (!Number.isFinite(input.discountAmountKrw) || input.discountAmountKrw <= 0) {
    throw new Error("优惠金额必须大于 0");
  }

  if (!Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0) {
    throw new Error("发放数量必须为正整数");
  }

  if (!input.startsDate.trim() || !input.endsDate.trim()) {
    throw new Error("请填写开始和结束日期");
  }

  if (!validateHHmm(input.startsTime)) {
    throw new Error("开始时间格式必须为 HH:mm");
  }

  if (!validateHHmm(input.endsTime)) {
    throw new Error("结束时间格式必须为 HH:mm");
  }

  const startsAt = combineSeoulDateTime(input.startsDate, input.startsTime);
  const endsAt = combineSeoulDateTime(input.endsDate, input.endsTime);

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("结束时间必须晚于开始时间");
  }

  return {
    discountAmountKrw: Math.round(input.discountAmountKrw),
    totalQuantity: input.totalQuantity,
    startsAt,
    endsAt,
    usageNote: input.usageNote.trim() || null,
    isActive: input.isActive,
  };
}

export async function assertPostLinkedCouponOwner(
  userId: string,
  postId: number,
  couponId: string,
) {
  const supabase = await createSupabaseServerClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_id, linked_coupon_id")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!post || post.author_id !== userId || post.linked_coupon_id !== couponId) {
    throw new Error("无权编辑该帖子优惠券");
  }

  const { data: merchantProfile, error: merchantError } = await supabase
    .from("merchant_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_verified", true)
    .maybeSingle();

  if (merchantError) {
    throw new Error(merchantError.message);
  }

  if (!merchantProfile?.id) {
    throw new Error("仅商家可编辑帖子优惠券");
  }

  const { data: coupon, error: couponError } = await supabase
    .from("merchant_coupons")
    .select("*")
    .eq("id", couponId)
    .eq("merchant_id", merchantProfile.id)
    .maybeSingle();

  if (couponError) {
    throw new Error(couponError.message);
  }

  if (!coupon) {
    throw new Error("优惠券不存在或无权编辑");
  }

  return { post, coupon, merchantProfile };
}

export async function updatePostLinkedCouponRecord(
  couponId: string,
  existingTitle: string,
  existingClaimedQuantity: number,
  input: PostLinkedCouponEditInput,
) {
  const validated = validateEditInput(input);

  if (validated.totalQuantity < existingClaimedQuantity) {
    throw new Error("发放总量不能小于已领取数量");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchant_coupons")
    .update({
      title: existingTitle,
      discount_amount_krw: validated.discountAmountKrw,
      total_quantity: validated.totalQuantity,
      starts_at: validated.startsAt,
      ends_at: validated.endsAt,
      usage_note: validated.usageNote,
      is_active: validated.isActive,
    })
    .eq("id", couponId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "更新优惠券失败");
  }

  return data;
}

export async function removePostLinkedCouponRecord(
  postId: number,
  couponId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("remove_post_linked_coupon", {
    p_post_id: postId,
    p_coupon_id: couponId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const mode = String(data ?? "");
  if (mode === "deleted") {
    return { mode: "deleted" as const };
  }

  if (mode === "deactivated") {
    return { mode: "deactivated" as const };
  }

  throw new Error("删除优惠券失败");
}

export { validateEditInput };
