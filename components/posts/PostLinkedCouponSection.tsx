"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MerchantCouponCard from "@/components/merchant/MerchantCouponCard";
import ShareButton from "@/components/share/ShareButton";
import PostLinkedCouponEditForm from "@/components/posts/PostLinkedCouponEditForm";
import { claimMerchantCouponAction } from "@/lib/actions/merchant-coupons";
import { removePostLinkedCouponAction } from "@/lib/actions/post-linked-coupon";
import type { PostLinkedCouponSummary } from "@/lib/data/posts";
import type { MerchantCoupon } from "@/lib/types/merchant-coupon";
import { useAuthStore } from "@/lib/store/auth-store";
import { fetchUserClaimedCouponIds } from "@/lib/supabase/merchant-coupon-queries";
import { buildPostSharePath } from "@/lib/share/paths";

interface PostLinkedCouponSectionProps {
  postId: number;
  postTitle: string;
  postAuthorId?: string | null;
  linkedCoupon: PostLinkedCouponSummary;
  onUpdated?: () => void | Promise<void>;
}

function toMerchantCoupon(coupon: PostLinkedCouponSummary): MerchantCoupon {
  return {
    id: coupon.id,
    merchantId: "",
    title: coupon.title,
    discountAmountKrw: coupon.discountAmountKrw,
    totalQuantity: coupon.totalQuantity,
    claimedQuantity: coupon.claimedQuantity,
    perUserLimit: 1,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    usageNote: coupon.usageNote,
    isActive: coupon.isActive,
    createdAt: "",
    updatedAt: "",
  };
}

export default function PostLinkedCouponSection({
  postId,
  postTitle,
  postAuthorId,
  linkedCoupon: initialLinkedCoupon,
  onUpdated,
}: PostLinkedCouponSectionProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [linkedCoupon, setLinkedCoupon] = useState(initialLinkedCoupon);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const isOwner = Boolean(
    user?.id && postAuthorId && user.id === postAuthorId,
  );

  useEffect(() => {
    setLinkedCoupon(initialLinkedCoupon);
    setEditing(false);
  }, [initialLinkedCoupon]);

  useEffect(() => {
    let cancelled = false;

    async function loadClaimState() {
      if (!user?.id || isOwner) {
        setClaimed(false);
        return;
      }

      try {
        const claimedIds = await fetchUserClaimedCouponIds(user.id, [
          linkedCoupon.id,
        ]);
        if (!cancelled) {
          setClaimed(claimedIds.has(linkedCoupon.id));
        }
      } catch {
        if (!cancelled) {
          setClaimed(false);
        }
      }
    }

    void loadClaimState();

    return () => {
      cancelled = true;
    };
  }, [user?.id, linkedCoupon.id, isOwner]);

  async function handleClaim() {
    setClaiming(true);
    setError("");

    try {
      const result = await claimMerchantCouponAction(linkedCoupon.id);
      setClaimed(true);
      setLinkedCoupon((current) => ({
        ...current,
        claimedQuantity: result.coupon.claimedQuantity,
        totalQuantity: result.coupon.totalQuantity,
        isActive: result.coupon.isActive,
        endsAt: result.coupon.endsAt,
        startsAt: result.coupon.startsAt,
      }));
      await onUpdated?.();
    } catch (claimError) {
      setError(
        claimError instanceof Error ? claimError.message : "领取优惠券失败",
      );
    } finally {
      setClaiming(false);
    }
  }

  function handleLoginRequired() {
    router.push(`/login?redirect=${encodeURIComponent(`/posts/${postId}`)}`);
  }

  async function handleSaved(coupon: PostLinkedCouponSummary) {
    setLinkedCoupon(coupon);
    setEditing(false);
    await onUpdated?.();
  }

  async function handleRemoved() {
    setEditing(false);
    await onUpdated?.();
  }

  async function handleRemoveCoupon() {
    const confirmed = window.confirm(
      linkedCoupon.claimedQuantity > 0
        ? "删除后帖子仍保留，但优惠券将从帖子移除；已领取未核销的券将失效。确认继续？"
        : "确认删除该帖子绑定的优惠券？帖子仍会保留。",
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setError("");

    try {
      await removePostLinkedCouponAction({
        postId,
        couponId: linkedCoupon.id,
      });
      await handleRemoved();
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "删除优惠券失败",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="pt-3">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900">帖子优惠券</h3>
      <MerchantCouponCard
        coupon={toMerchantCoupon(linkedCoupon)}
        claimed={claimed}
        claiming={claiming}
        showManageActions={isOwner}
        isLoggedIn={Boolean(user)}
        onClaim={handleClaim}
        onEdit={() => setEditing(true)}
        onRemove={() => void handleRemoveCoupon()}
        removing={removing}
        onLoginRequired={handleLoginRequired}
        extraAction={
          <ShareButton
            variant="inline"
            path={buildPostSharePath(postId)}
            title={linkedCoupon.title}
            text={`${linkedCoupon.title} · ${postTitle}`}
          />
        }
      />

      {editing && isOwner ? (
        <PostLinkedCouponEditForm
          postId={postId}
          coupon={linkedCoupon}
          onCancel={() => setEditing(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
