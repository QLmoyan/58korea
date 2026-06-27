"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatCouponAmountKrw,
  formatCouponEndDate,
  formatCouponRemainingTime,
  formatRedeemCodeDisplay,
  getUserCouponDisplayStatusLabel,
  getUserCouponInactiveMessage,
} from "@/lib/merchant/coupon-utils";
import {
  fetchUserCouponsWithDetails,
  splitUserCouponsByUsability,
} from "@/lib/supabase/merchant-coupon-queries";
import type { UserCouponWithDetails } from "@/lib/types/merchant-coupon";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { CLIENT_FETCH_TIMEOUT_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

interface ProfileCouponsListProps {
  userId: string;
}

function CouponCard({ coupon }: { coupon: UserCouponWithDetails }) {
  const isUsable = coupon.displayStatus === "unused";
  const inactiveMessage = getUserCouponInactiveMessage(coupon.displayStatus);

  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-zinc-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">{coupon.merchantName}</p>
          <p className="mt-1 text-base font-bold text-amber-700">
            {formatCouponAmountKrw(coupon.discountAmountKrw)}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {coupon.title}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {formatCouponEndDate(coupon.endsAt)}
          </p>
          {isUsable ? (
            <p className="mt-1 text-xs text-emerald-600">
              {formatCouponRemainingTime(coupon.expiresAt)}
            </p>
          ) : inactiveMessage ? (
            <p className="mt-2 text-xs leading-5 text-rose-500">{inactiveMessage}</p>
          ) : null}
          {coupon.usageNote ? (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {coupon.usageNote}
            </p>
          ) : null}
          {isUsable && coupon.redeemCode ? (
            <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[11px] text-zinc-400">核销码</p>
              <p className="mt-1 font-mono text-lg font-bold tracking-[0.15em] text-zinc-900">
                {formatRedeemCodeDisplay(coupon.redeemCode)}
              </p>
              <p className="mt-1 text-[11px] text-zinc-400">
                到店出示此码给商家核销
              </p>
            </div>
          ) : null}
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isUsable
              ? "bg-emerald-50 text-emerald-600"
              : coupon.displayStatus === "used"
                ? "bg-zinc-100 text-zinc-500"
                : "bg-rose-50 text-rose-500"
          }`}
        >
          {getUserCouponDisplayStatusLabel(coupon.displayStatus)}
        </span>
      </div>
    </article>
  );
}

export default function ProfileCouponsList({ userId }: ProfileCouponsListProps) {
  const [coupons, setCoupons] = useState<UserCouponWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await withTimeout(
        fetchUserCouponsWithDetails(userId),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载优惠券超时，请检查网络后重试",
      );
      setCoupons(data);
    } catch (loadError) {
      logClientError("profile.coupons", loadError, { userId });
      setError(
        loadError instanceof Error ? loadError.message : "加载优惠券失败",
      );
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons, loadAttempt]);

  const { usable, inactive } = useMemo(
    () => splitUserCouponsByUsability(coupons),
    [coupons],
  );

  const loadingOverdue = useLoadingDeadline(
    loading,
    CLIENT_FETCH_TIMEOUT_MS + 3_000,
  );
  const displayError =
    error ?? (loadingOverdue ? "加载优惠券超时，请检查网络后重试" : null);

  if (loading && !displayError) {
    return <AsyncStatePanel message="加载中..." />;
  }

  if (displayError) {
    return (
      <AsyncStatePanel
        message={displayError}
        tone="error"
        onRetry={() => setLoadAttempt((current) => current + 1)}
      />
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-zinc-400">还没有领取优惠券，去商家主页看看吧</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-4">
      {usable.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">可使用</h3>
          {usable.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </section>
      ) : (
        <div className="rounded-2xl bg-white px-4 py-8 text-center ring-1 ring-zinc-100">
          <p className="text-sm text-zinc-400">当前没有可使用的优惠券</p>
        </div>
      )}

      {inactive.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-500">已失效 / 已使用</h3>
          {inactive.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
