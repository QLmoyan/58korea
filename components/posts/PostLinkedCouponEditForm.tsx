"use client";

import { useEffect, useState } from "react";
import {
  updatePostLinkedCouponAction,
} from "@/lib/actions/post-linked-coupon";
import type { PostLinkedCouponSummary } from "@/lib/data/posts";
import {
  combineSeoulDateTime,
  splitSeoulDateTime,
  validateHHmm,
} from "@/lib/merchant/coupon-utils";

interface PostLinkedCouponEditFormProps {
  postId: number;
  coupon: PostLinkedCouponSummary;
  onCancel: () => void;
  onSaved: (coupon: PostLinkedCouponSummary) => void;
}

export default function PostLinkedCouponEditForm({
  postId,
  coupon,
  onCancel,
  onSaved,
}: PostLinkedCouponEditFormProps) {
  const initialStarts = splitSeoulDateTime(coupon.startsAt);
  const initialEnds = splitSeoulDateTime(coupon.endsAt);

  const [discountAmountKrw, setDiscountAmountKrw] = useState(
    String(coupon.discountAmountKrw),
  );
  const [totalQuantity, setTotalQuantity] = useState(
    String(coupon.totalQuantity),
  );
  const [startsDate, setStartsDate] = useState(initialStarts.date);
  const [startsTime, setStartsTime] = useState(initialStarts.time);
  const [endsDate, setEndsDate] = useState(initialEnds.date);
  const [endsTime, setEndsTime] = useState(initialEnds.time);
  const [usageNote, setUsageNote] = useState(coupon.usageNote ?? "");
  const [isActive, setIsActive] = useState(coupon.isActive);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const starts = splitSeoulDateTime(coupon.startsAt);
    const ends = splitSeoulDateTime(coupon.endsAt);
    setDiscountAmountKrw(String(coupon.discountAmountKrw));
    setTotalQuantity(String(coupon.totalQuantity));
    setStartsDate(starts.date);
    setStartsTime(starts.time);
    setEndsDate(ends.date);
    setEndsTime(ends.time);
    setUsageNote(coupon.usageNote ?? "");
    setIsActive(coupon.isActive);
    setError("");
  }, [coupon]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const amount = Number(discountAmountKrw);
      const quantity = Number(totalQuantity);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("请填写有效的优惠金额（必须大于 0）");
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error("请填写有效的发放数量（正整数）");
      }

      if (quantity < coupon.claimedQuantity) {
        throw new Error(`发放数量不能小于已领取数量（${coupon.claimedQuantity}）`);
      }

      if (!startsDate.trim()) {
        throw new Error("请填写开始日期");
      }

      if (!endsDate.trim()) {
        throw new Error("请填写结束日期");
      }

      if (!validateHHmm(startsTime)) {
        throw new Error("开始时间格式必须为 HH:mm（例如 10:00）");
      }

      if (!validateHHmm(endsTime)) {
        throw new Error("结束时间格式必须为 HH:mm（例如 19:00）");
      }

      const startsAt = combineSeoulDateTime(startsDate, startsTime);
      const endsAt = combineSeoulDateTime(endsDate, endsTime);

      if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
        throw new Error("结束时间必须晚于开始时间");
      }

      const result = await updatePostLinkedCouponAction({
        postId,
        couponId: coupon.id,
        discountAmountKrw: amount,
        totalQuantity: quantity,
        startsDate,
        startsTime,
        endsDate,
        endsTime,
        usageNote,
        isActive,
      });

      onSaved(result.coupon);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "保存优惠券失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-2xl border border-zinc-100 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-zinc-900">编辑帖子优惠券</h4>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 touch-manipulation px-2 text-xs text-zinc-400 hover:text-zinc-600"
        >
          取消
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        {coupon.title} · 已领 {coupon.claimedQuantity}/{coupon.totalQuantity}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">优惠金额 (KRW)</span>
          <input
            type="number"
            min={1}
            value={discountAmountKrw}
            onChange={(event) => setDiscountAmountKrw(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">发放数量</span>
          <input
            type="number"
            min={coupon.claimedQuantity || 1}
            value={totalQuantity}
            onChange={(event) => setTotalQuantity(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">开始日期</span>
          <input
            type="date"
            value={startsDate}
            onChange={(event) => setStartsDate(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">开始时间 (HH:mm)</span>
          <input
            value={startsTime}
            onChange={(event) => setStartsTime(event.target.value)}
            placeholder="09:30"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">结束日期</span>
          <input
            type="date"
            value={endsDate}
            onChange={(event) => setEndsDate(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">结束时间 (HH:mm)</span>
          <input
            value={endsTime}
            onChange={(event) => setEndsTime(event.target.value)}
            placeholder="19:00"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-zinc-500">使用说明</span>
        <textarea
          value={usageNote}
          onChange={(event) => setUsageNote(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        启用优惠券
      </label>

      {error ? <p className="text-xs text-rose-500">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 touch-manipulation rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "保存中..." : "保存修改"}
        </button>
      </div>
    </form>
  );
}
