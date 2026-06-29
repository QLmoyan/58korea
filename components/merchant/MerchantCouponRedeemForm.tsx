"use client";

import { useState } from "react";
import { redeemUserCouponAction } from "@/lib/actions/merchant-coupons";
import { normalizeRedeemCodeInput } from "@/lib/merchant/coupon-utils";

interface MerchantCouponRedeemFormProps {
  onRedeemed?: () => void;
}

export default function MerchantCouponRedeemForm({
  onRedeemed,
}: MerchantCouponRedeemFormProps) {
  const [redeemCode, setRedeemCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleInputChange(value: string) {
    const digitsOnly = value.replace(/\D/g, "");
    setRedeemCode(digitsOnly.slice(0, 8));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await redeemUserCouponAction(redeemCode);
      setMessage("核销成功");
      setRedeemCode("");
      onRedeemed?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "核销失败",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const displayCode = normalizeRedeemCodeInput(redeemCode);

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-0 w-full space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-left"
    >
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">核销优惠券</h3>
        <p className="mt-1 text-xs text-zinc-500">
          输入用户出示的 8 位数字核销码完成核销
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={redeemCode}
          onChange={(event) => handleInputChange(event.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          placeholder="请输入数字核销码"
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm tracking-[0.2em] outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={submitting || displayCode.length < 6}
          className="min-h-11 shrink-0 touch-manipulation rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "核销中..." : "核销"}
        </button>
      </div>

      {displayCode.length >= 6 ? (
        <p className="text-xs text-zinc-400">
          当前输入：{displayCode.replace(/(\d{4})(?=\d)/g, "$1 ").trim()}
        </p>
      ) : null}

      {message ? (
        <p className="text-xs font-medium text-emerald-600">{message}</p>
      ) : null}
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </form>
  );
}
