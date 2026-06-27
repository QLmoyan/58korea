import {
  buildAutoCouponTitleFromAmount,
  combineSeoulDateTime,
  validateHHmm,
} from "@/lib/merchant/coupon-utils";
import type {
  PostCouponBindingInput,
  PublishPostNewCouponInput,
} from "@/lib/types/community";

export function validatePublishCouponInput(input: PublishPostNewCouponInput) {
  if (!Number.isFinite(input.discountAmountKrw) || input.discountAmountKrw <= 0) {
    throw new Error("请填写有效的优惠金额（必须大于 0）");
  }

  if (!Number.isInteger(input.totalQuantity) || input.totalQuantity <= 0) {
    throw new Error("请填写有效的发放数量（正整数）");
  }

  if (!input.startsDate.trim()) {
    throw new Error("请填写优惠券开始日期");
  }

  if (!input.endsDate.trim()) {
    throw new Error("请填写优惠券结束日期");
  }

  if (!validateHHmm(input.startsTime)) {
    throw new Error("开始时间格式必须为 HH:mm（例如 10:00）");
  }

  if (!validateHHmm(input.endsTime)) {
    throw new Error("结束时间格式必须为 HH:mm（例如 19:00）");
  }

  const startsAt = combineSeoulDateTime(input.startsDate, input.startsTime);
  const endsAt = combineSeoulDateTime(input.endsDate, input.endsTime);

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("优惠券结束时间必须晚于开始时间");
  }

  const discountAmountKrw = Math.round(input.discountAmountKrw);

  return {
    title: buildAutoCouponTitleFromAmount(discountAmountKrw),
    discountAmountKrw,
    totalQuantity: input.totalQuantity,
    startsAt,
    endsAt,
    usageNote: input.usageNote?.trim() || null,
  };
}

export function validatePublishCouponBinding(
  binding: PostCouponBindingInput | undefined,
) {
  if (!binding || binding.mode === "none") {
    return null;
  }

  return validatePublishCouponInput(binding.coupon);
}
