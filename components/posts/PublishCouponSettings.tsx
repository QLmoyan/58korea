"use client";

import { buildAutoCouponTitleFromAmount } from "@/lib/merchant/coupon-utils";
import type {
  PostCouponBindingInput,
  PostCouponBindingMode,
  PublishPostNewCouponInput,
} from "@/lib/types/community";

interface PublishCouponSettingsProps {
  value: PostCouponBindingInput;
  onChange: (value: PostCouponBindingInput) => void;
  disabled?: boolean;
}

const defaultNewCoupon = (): PublishPostNewCouponInput => ({
  discountAmountKrw: 3000,
  totalQuantity: 10,
  startsDate: "",
  startsTime: "10:00",
  endsDate: "",
  endsTime: "19:00",
  usageNote: "",
});

export default function PublishCouponSettings({
  value,
  onChange,
  disabled = false,
}: PublishCouponSettingsProps) {
  function setMode(mode: PostCouponBindingMode) {
    if (mode === "none") {
      onChange({ mode: "none" });
      return;
    }

    onChange({
      mode: "add",
      coupon: defaultNewCoupon(),
    });
  }

  function updateCoupon(patch: Partial<PublishPostNewCouponInput>) {
    if (value.mode !== "add") {
      return;
    }

    onChange({
      mode: "add",
      coupon: {
        ...value.coupon,
        ...patch,
      },
    });
  }

  const previewTitle =
    value.mode === "add"
      ? buildAutoCouponTitleFromAmount(value.coupon.discountAmountKrw)
      : null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-zinc-700">优惠券设置</h2>
        <p className="mt-1 text-xs text-zinc-400">
          发布帖子时可一并创建优惠券，无需先去商家主页单独创建
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "none", label: "不添加优惠券" },
            { id: "add", label: "添加优惠券" },
          ] as const
        ).map((option) => {
          const isActive = value.mode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => setMode(option.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {value.mode === "add" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                优惠金额 (KRW) <span className="text-rose-500">*</span>
              </span>
              <input
                type="number"
                min={1}
                disabled={disabled}
                value={value.coupon.discountAmountKrw}
                onChange={(event) =>
                  updateCoupon({
                    discountAmountKrw: Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                数量 <span className="text-rose-500">*</span>
              </span>
              <input
                type="number"
                min={1}
                disabled={disabled}
                value={value.coupon.totalQuantity}
                onChange={(event) =>
                  updateCoupon({ totalQuantity: Number(event.target.value) })
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>
          </div>

          {previewTitle ? (
            <p className="text-xs text-zinc-400">
              优惠券标题（自动生成）<span className="text-rose-500">*</span>：{previewTitle}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                开始日期 <span className="text-rose-500">*</span>
              </span>
              <input
                type="date"
                disabled={disabled}
                value={value.coupon.startsDate}
                onChange={(event) =>
                  updateCoupon({ startsDate: event.target.value })
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                开始时间 (HH:mm) <span className="text-rose-500">*</span>
              </span>
              <input
                disabled={disabled}
                value={value.coupon.startsTime}
                onChange={(event) =>
                  updateCoupon({ startsTime: event.target.value })
                }
                placeholder="10:00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                结束日期 <span className="text-rose-500">*</span>
              </span>
              <input
                type="date"
                disabled={disabled}
                value={value.coupon.endsDate}
                onChange={(event) =>
                  updateCoupon({ endsDate: event.target.value })
                }
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">
                结束时间 (HH:mm) <span className="text-rose-500">*</span>
              </span>
              <input
                disabled={disabled}
                value={value.coupon.endsTime}
                onChange={(event) =>
                  updateCoupon({ endsTime: event.target.value })
                }
                placeholder="19:00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-zinc-500">使用说明</span>
            <textarea
              value={value.coupon.usageNote ?? ""}
              disabled={disabled}
              onChange={(event) =>
                updateCoupon({ usageNote: event.target.value })
              }
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-amber-400"
              placeholder="例如：到店消费满 20000 韩元可用"
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
