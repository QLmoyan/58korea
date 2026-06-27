export type UserCouponStatus = "claimed" | "used" | "cancelled" | "expired";

export type UserCouponDisplayStatus =
  | "unused"
  | "used"
  | "expired"
  | "cancelled";

export interface MerchantCoupon {
  id: string;
  merchantId: string;
  title: string;
  discountAmountKrw: number;
  totalQuantity: number;
  claimedQuantity: number;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  usageNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCouponWithDetails {
  id: string;
  couponId: string;
  userId: string;
  status: UserCouponStatus;
  claimedAt: string;
  usedAt: string | null;
  expiresAt: string | null;
  redeemCode: string | null;
  redeemedAt: string | null;
  displayStatus: UserCouponDisplayStatus;
  merchantName: string;
  title: string;
  discountAmountKrw: number;
  endsAt: string | null;
  couponIsActive: boolean;
  usageNote: string | null;
}

export interface CreateMerchantCouponInput {
  merchantId: string;
  title: string;
  discountAmountKrw: number;
  totalQuantity: number;
  startsAt: string | null;
  endsAt: string | null;
  usageNote: string | null;
  isActive: boolean;
}

export interface UpdateMerchantCouponInput {
  couponId: string;
  title: string;
  discountAmountKrw: number;
  totalQuantity: number;
  startsAt: string | null;
  endsAt: string | null;
  usageNote: string | null;
  isActive: boolean;
}
