"use server";

import type { PostLinkedCouponSummary } from "@/lib/data/posts";
import {
  assertPostLinkedCouponOwner,
  type PostLinkedCouponEditInput,
  removePostLinkedCouponRecord,
  updatePostLinkedCouponRecord,
} from "@/lib/merchant/post-linked-coupon-edit";
import { getServerAuthUser } from "@/lib/supabase/server";

function mapLinkedCouponSummary(row: {
  id: string;
  title: string;
  discount_amount_krw: number;
  total_quantity: number;
  claimed_quantity: number;
  starts_at: string | null;
  ends_at: string | null;
  usage_note: string | null;
  is_active: boolean;
}): PostLinkedCouponSummary {
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

export interface UpdatePostLinkedCouponActionInput extends PostLinkedCouponEditInput {
  postId: number;
  couponId: string;
}

export interface UpdatePostLinkedCouponActionResult {
  coupon: PostLinkedCouponSummary;
}

export interface RemovePostLinkedCouponActionResult {
  mode: "deleted" | "deactivated";
}

export async function updatePostLinkedCouponAction(
  input: UpdatePostLinkedCouponActionInput,
): Promise<UpdatePostLinkedCouponActionResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const { coupon } = await assertPostLinkedCouponOwner(
    user.id,
    input.postId,
    input.couponId,
  );

  const updated = await updatePostLinkedCouponRecord(
    input.couponId,
    coupon.title,
    coupon.claimed_quantity,
    input,
  );

  return { coupon: mapLinkedCouponSummary(updated) };
}

export async function removePostLinkedCouponAction(input: {
  postId: number;
  couponId: string;
}): Promise<RemovePostLinkedCouponActionResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const { coupon } = await assertPostLinkedCouponOwner(
    user.id,
    input.postId,
    input.couponId,
  );

  return removePostLinkedCouponRecord(input.postId, input.couponId);
}
