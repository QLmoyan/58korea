"use client";

import type { ReactNode } from "react";
import type { MerchantCoupon } from "@/lib/types/merchant-coupon";
import {
  formatCouponAmountKrw,
  formatCouponEndDate,
  formatCouponStockLabel,
  getCouponClaimState,
} from "@/lib/merchant/coupon-utils";

interface MerchantCouponCardProps {
  coupon: MerchantCoupon;
  claimed: boolean;
  claiming?: boolean;
  showManageActions?: boolean;
  onClaim?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  removing?: boolean;
  onLoginRequired?: () => void;
  isLoggedIn: boolean;
  extraAction?: ReactNode;
}

export default function MerchantCouponCard({
  coupon,
  claimed,
  claiming = false,
  showManageActions = false,
  onClaim,
  onEdit,
  onRemove,
  removing = false,
  onLoginRequired,
  isLoggedIn,
  extraAction,
}: MerchantCouponCardProps) {
  const claimState = getCouponClaimState(coupon, { claimed });
  const canClaim = claimState.kind === "claimable";

  function handleClaimClick() {
    if (!canClaim || claiming) {
      return;
    }

    if (!isLoggedIn) {
      onLoginRequired?.();
      return;
    }

    onClaim?.();
  }

  function renderClaimAction() {
    if (showManageActions) {
      return (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 touch-manipulation rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-medium text-zinc-700 hover:bg-white active:bg-zinc-50"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className="min-h-11 touch-manipulation rounded-full border border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 active:bg-rose-100 disabled:opacity-60"
          >
            {removing ? "处理中..." : "删除优惠券"}
          </button>
        </div>
      );
    }

    if (claimState.kind === "claimed") {
      return (
        <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-500">
          已领取
        </span>
      );
    }

    if (claimState.kind === "disabled") {
      return (
        <button
          type="button"
          disabled
          className="min-h-11 touch-manipulation rounded-full bg-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-500 disabled:cursor-not-allowed"
        >
          {claimState.label}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleClaimClick}
        disabled={claiming}
        className="min-h-11 touch-manipulation rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 active:bg-amber-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {claiming ? "领取中..." : "领取"}
      </button>
    );
  }

  return (
    <article className="rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 ring-1 ring-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-amber-700">
            {formatCouponAmountKrw(coupon.discountAmountKrw)}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-900">{coupon.title}</h3>
          <p className="mt-2 text-xs text-zinc-500">
            {formatCouponStockLabel(coupon)} · {formatCouponEndDate(coupon.endsAt)}
          </p>
          {coupon.usageNote ? (
            <p className="mt-2 text-xs leading-5 text-zinc-500">{coupon.usageNote}</p>
          ) : null}
          {showManageActions ? (
            <p className="mt-2 text-[11px] text-zinc-400">
              {coupon.isActive ? "启用中" : "已停用"}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {renderClaimAction()}
            {extraAction}
          </div>
        </div>
      </div>
    </article>
  );
}
