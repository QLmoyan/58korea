"use client";

import { useEffect, useState } from "react";
import type { MerchantCoupon } from "@/lib/types/merchant-coupon";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/merchant/coupon-utils";

interface MerchantCouponFormProps {
  merchantId: string;
  initialCoupon?: MerchantCoupon | null;
  submitting?: boolean;
  onSubmit: (values: {
    merchantId: string;
    title: string;
    discountAmountKrw: number;
    totalQuantity: number;
    startsAt: string | null;
    endsAt: string | null;
    usageNote: string | null;
    isActive: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
}

export default function MerchantCouponForm({
  merchantId,
  initialCoupon,
  submitting = false,
  onSubmit,
  onCancel,
}: MerchantCouponFormProps) {
  const [title, setTitle] = useState(initialCoupon?.title ?? "");
  const [discountAmountKrw, setDiscountAmountKrw] = useState(
    initialCoupon ? String(initialCoupon.discountAmountKrw) : "",
  );
  const [totalQuantity, setTotalQuantity] = useState(
    initialCoupon ? String(initialCoupon.totalQuantity) : "",
  );
  const [startsAt, setStartsAt] = useState(
    toDatetimeLocalValue(initialCoupon?.startsAt ?? null),
  );
  const [endsAt, setEndsAt] = useState(
    toDatetimeLocalValue(initialCoupon?.endsAt ?? null),
  );
  const [usageNote, setUsageNote] = useState(initialCoupon?.usageNote ?? "");
  const [isActive, setIsActive] = useState(initialCoupon?.isActive ?? true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(initialCoupon?.title ?? "");
    setDiscountAmountKrw(
      initialCoupon ? String(initialCoupon.discountAmountKrw) : "",
    );
    setTotalQuantity(initialCoupon ? String(initialCoupon.totalQuantity) : "");
    setStartsAt(toDatetimeLocalValue(initialCoupon?.startsAt ?? null));
    setEndsAt(toDatetimeLocalValue(initialCoupon?.endsAt ?? null));
    setUsageNote(initialCoupon?.usageNote ?? "");
    setIsActive(initialCoupon?.isActive ?? true);
    setError("");
  }, [initialCoupon]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const amount = Number(discountAmountKrw);
    const quantity = Number(totalQuantity);

    if (!title.trim()) {
      setError("请填写优惠券标题");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("优惠金额必须大于 0");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("发放数量必须为正整数");
      return;
    }

    try {
      await onSubmit({
        merchantId,
        title: title.trim(),
        discountAmountKrw: Math.round(amount),
        totalQuantity: quantity,
        startsAt: fromDatetimeLocalValue(startsAt),
        endsAt: fromDatetimeLocalValue(endsAt),
        usageNote: usageNote.trim() || null,
        isActive,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "保存优惠券失败",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-zinc-100 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">
          {initialCoupon ? "编辑优惠券" : "创建优惠券"}
        </h3>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            取消
          </button>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-zinc-500">优惠券标题</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          placeholder="例如：新客立减"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">优惠金额 (KRW)</span>
          <input
            type="number"
            min={1}
            value={discountAmountKrw}
            onChange={(event) => setDiscountAmountKrw(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
            placeholder="3000"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">发放总数量</span>
          <input
            type="number"
            min={1}
            value={totalQuantity}
            onChange={(event) => setTotalQuantity(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
            placeholder="100"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">开始时间</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">结束时间</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
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
          placeholder="例如：到店消费满 20000 韩元可用"
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "保存中..." : initialCoupon ? "保存修改" : "创建优惠券"}
      </button>
    </form>
  );
}
