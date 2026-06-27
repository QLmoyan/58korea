import type {
  MerchantCoupon,
  UserCouponDisplayStatus,
  UserCouponStatus,
} from "@/lib/types/merchant-coupon";

export function getCouponRemainingQuantity(coupon: Pick<
  MerchantCoupon,
  "totalQuantity" | "claimedQuantity"
>): number {
  return Math.max(coupon.totalQuantity - coupon.claimedQuantity, 0);
}

export function formatCouponAmountKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}韩元优惠券`;
}

export function buildAutoCouponTitleFromAmount(discountAmountKrw: number): string {
  return `${Math.round(discountAmountKrw)}韩元优惠券`;
}

export function formatCouponEndDate(endsAt: string | null): string {
  if (!endsAt) {
    return "长期有效";
  }

  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) {
    return "长期有效";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `有效期至 ${year}-${month}-${day}`;
}

export function isCouponExpired(endsAt: string | null, now = new Date()): boolean {
  if (!endsAt) {
    return false;
  }

  const end = new Date(endsAt);
  return !Number.isNaN(end.getTime()) && end.getTime() < now.getTime();
}

export function isCouponNotStarted(startsAt: string | null, now = new Date()): boolean {
  if (!startsAt) {
    return false;
  }

  const start = new Date(startsAt);
  return !Number.isNaN(start.getTime()) && start.getTime() > now.getTime();
}

export function isCouponSoldOut(coupon: Pick<
  MerchantCoupon,
  "totalQuantity" | "claimedQuantity"
>): boolean {
  return getCouponRemainingQuantity(coupon) <= 0;
}

export function isCouponPubliclyVisible(
  coupon: Pick<MerchantCoupon, "isActive" | "startsAt" | "endsAt">,
  now = new Date(),
): boolean {
  if (!coupon.isActive) {
    return false;
  }

  if (isCouponNotStarted(coupon.startsAt, now)) {
    return false;
  }

  if (isCouponExpired(coupon.endsAt, now)) {
    return false;
  }

  return true;
}

export type CouponClaimState =
  | { kind: "claimable" }
  | { kind: "claimed" }
  | { kind: "disabled"; label: string };

export function getCouponClaimState(
  coupon: Pick<
    MerchantCoupon,
    "isActive" | "startsAt" | "endsAt" | "totalQuantity" | "claimedQuantity"
  >,
  options: { claimed: boolean },
  now = new Date(),
): CouponClaimState {
  if (options.claimed) {
    return { kind: "claimed" };
  }

  if (!coupon.isActive) {
    return { kind: "disabled", label: "已失效" };
  }

  if (isCouponExpired(coupon.endsAt, now)) {
    return { kind: "disabled", label: "已过期" };
  }

  if (isCouponNotStarted(coupon.startsAt, now)) {
    return { kind: "disabled", label: "未开始" };
  }

  if (isCouponSoldOut(coupon)) {
    return { kind: "disabled", label: "已领完" };
  }

  return { kind: "claimable" };
}

export function formatCouponStockLabel(
  coupon: Pick<MerchantCoupon, "totalQuantity" | "claimedQuantity">,
): string {
  const remaining = getCouponRemainingQuantity(coupon);
  return `已领 ${coupon.claimedQuantity}/${coupon.totalQuantity} · 剩余 ${remaining} 张`;
}

export function normalizeRedeemCodeInput(input: string): string {
  const trimmed = input.trim();
  const digitsOnly = trimmed.replace(/\s+/g, "");

  if (/^\d+$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return digitsOnly.toUpperCase();
}

export function formatRedeemCodeDisplay(code: string): string {
  const normalized = code.replace(/\s+/g, "");

  if (/^\d+$/.test(normalized)) {
    if (normalized.length <= 6) {
      return normalized.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
    }

    const mid = Math.ceil(normalized.length / 2);
    return `${normalized.slice(0, mid)} ${normalized.slice(mid)}`;
  }

  return normalized;
}

export function getUserCouponInactiveMessage(
  status: UserCouponDisplayStatus,
): string | null {
  if (status === "cancelled") {
    return "对不起，因商家改动，该优惠券已失效";
  }

  if (status === "expired") {
    return "对不起，该优惠券已过期";
  }

  return null;
}

export function getUserCouponDisplayStatus(input: {
  status: UserCouponStatus;
  expiresAt?: string | null;
  endsAt?: string | null;
  couponIsActive?: boolean;
  now?: Date;
}): UserCouponDisplayStatus {
  if (input.status === "used") {
    return "used";
  }

  if (input.status === "cancelled") {
    return "cancelled";
  }

  if (input.status === "expired") {
    return "expired";
  }

  const expiry = input.expiresAt ?? input.endsAt ?? null;
  if (isCouponExpired(expiry, input.now)) {
    return "expired";
  }

  if (input.couponIsActive === false) {
    return "cancelled";
  }

  return "unused";
}

export function getUserCouponDisplayStatusLabel(
  status: UserCouponDisplayStatus,
): string {
  switch (status) {
    case "used":
      return "已使用";
    case "expired":
      return "已过期";
    case "cancelled":
      return "已失效";
    default:
      return "未使用";
  }
}

export function formatCouponRemainingTime(
  expiresAt: string | null,
  now = new Date(),
): string {
  if (!expiresAt) {
    return "长期有效";
  }

  const end = new Date(expiresAt);
  if (Number.isNaN(end.getTime())) {
    return "长期有效";
  }

  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "已过期";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `剩余 ${days} 天 ${hours} 小时`;
  }

  if (hours > 0) {
    return `剩余 ${hours} 小时 ${minutes} 分钟`;
  }

  return `剩余 ${minutes} 分钟`;
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTime() - date.getTimezoneOffset() * 60_000;
  return new Date(offset).toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateHHmm(time: string): boolean {
  return HHMM_PATTERN.test(time.trim());
}

export function combineSeoulDateTime(date: string, time: string): string {
  const trimmedDate = date.trim();
  const trimmedTime = time.trim();

  if (!DATE_PATTERN.test(trimmedDate)) {
    throw new Error("日期格式无效");
  }

  if (!validateHHmm(trimmedTime)) {
    throw new Error("时间格式必须为 HH:mm");
  }

  const parsed = new Date(`${trimmedDate}T${trimmedTime}:00+09:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("日期或时间无效");
  }

  return parsed.toISOString();
}

export function splitSeoulDateTime(iso: string | null): {
  date: string;
  time: string;
} {
  if (!iso) {
    return { date: "", time: "" };
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: "", time: "" };
  }

  const date = parsed.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const time = parsed.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return { date, time };
}
