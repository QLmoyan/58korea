"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MerchantCouponCard from "@/components/merchant/MerchantCouponCard";
import MerchantCouponForm from "@/components/merchant/MerchantCouponForm";
import MerchantCouponRedeemForm from "@/components/merchant/MerchantCouponRedeemForm";
import {
  claimMerchantCouponAction,
  createMerchantCouponAction,
  updateMerchantCouponAction,
} from "@/lib/actions/merchant-coupons";
import { isCouponPubliclyVisible } from "@/lib/merchant/coupon-utils";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  fetchCouponsByMerchantId,
  fetchUserClaimedCouponIds,
} from "@/lib/supabase/merchant-coupon-queries";
import type { MerchantCoupon } from "@/lib/types/merchant-coupon";

interface MerchantCouponsSectionProps {
  merchantId: string;
  merchantOwnerUserId: string;
  allowManage?: boolean;
  heading?: string;
}

export default function MerchantCouponsSection({
  merchantId,
  merchantOwnerUserId,
  allowManage = true,
  heading = "优惠券",
}: MerchantCouponsSectionProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const isOwner =
    allowManage && Boolean(user?.id && user.id === merchantOwnerUserId);

  const [coupons, setCoupons] = useState<MerchantCoupon[]>([]);
  const [claimedCouponIds, setClaimedCouponIds] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<MerchantCoupon | null>(
    null,
  );

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const nextCoupons = await fetchCouponsByMerchantId(merchantId);
      setCoupons(nextCoupons);

      if (user?.id) {
        const claimedIds = await fetchUserClaimedCouponIds(
          user.id,
          nextCoupons.map((coupon) => coupon.id),
        );
        setClaimedCouponIds(claimedIds);
      } else {
        setClaimedCouponIds(new Set());
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "加载优惠券失败",
      );
    } finally {
      setLoading(false);
    }
  }, [merchantId, user?.id]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const visibleCoupons = useMemo(() => {
    if (isOwner) {
      return coupons;
    }

    return coupons.filter((coupon) => isCouponPubliclyVisible(coupon));
  }, [coupons, isOwner]);

  async function handleClaim(couponId: string) {
    setClaimingCouponId(couponId);
    setError("");

    try {
      await claimMerchantCouponAction(couponId);
      await loadCoupons();
    } catch (claimError) {
      setError(
        claimError instanceof Error ? claimError.message : "领取优惠券失败",
      );
    } finally {
      setClaimingCouponId(null);
    }
  }

  async function handleCreate(values: {
    merchantId: string;
    title: string;
    discountAmountKrw: number;
    totalQuantity: number;
    startsAt: string | null;
    endsAt: string | null;
    usageNote: string | null;
    isActive: boolean;
  }) {
    setSubmitting(true);
    setError("");

    try {
      await createMerchantCouponAction(values);
      setShowCreateForm(false);
      await loadCoupons();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(values: {
    merchantId: string;
    title: string;
    discountAmountKrw: number;
    totalQuantity: number;
    startsAt: string | null;
    endsAt: string | null;
    usageNote: string | null;
    isActive: boolean;
  }) {
    if (!editingCoupon) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await updateMerchantCouponAction({
        couponId: editingCoupon.id,
        ...values,
      });
      setEditingCoupon(null);
      await loadCoupons();
    } finally {
      setSubmitting(false);
    }
  }

  function handleLoginRequired() {
    router.push(
      `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
    );
  }

  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">{heading}</h2>
        {isOwner ? (
          <button
            type="button"
            onClick={() => {
              setEditingCoupon(null);
              setShowCreateForm((current) => !current);
            }}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {showCreateForm ? "收起表单" : "创建优惠券"}
          </button>
        ) : null}
      </div>

      {isOwner ? <MerchantCouponRedeemForm /> : null}

      {isOwner && showCreateForm ? (
        <div className="mb-4">
          <MerchantCouponForm
            merchantId={merchantId}
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : null}

      {isOwner && editingCoupon ? (
        <div className="mb-4">
          <MerchantCouponForm
            merchantId={merchantId}
            initialCoupon={editingCoupon}
            submitting={submitting}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCoupon(null)}
          />
        </div>
      ) : null}

      {loading ? (
        <p className="py-6 text-center text-sm text-zinc-400">加载中...</p>
      ) : error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-500">
          {error}
        </p>
      ) : visibleCoupons.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          {isOwner ? "还没有创建优惠券" : "该商家暂无可用优惠券"}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleCoupons.map((coupon) => (
            <MerchantCouponCard
              key={coupon.id}
              coupon={coupon}
              claimed={claimedCouponIds.has(coupon.id)}
              claiming={claimingCouponId === coupon.id}
              showManageActions={isOwner}
              isLoggedIn={Boolean(user)}
              onClaim={() => handleClaim(coupon.id)}
              onEdit={() => {
                setShowCreateForm(false);
                setEditingCoupon(coupon);
              }}
              onLoginRequired={handleLoginRequired}
            />
          ))}
        </div>
      )}
    </section>
  );
}
