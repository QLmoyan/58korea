"use client";

import { MERCHANT_LOGO_ACCEPT } from "@/lib/profile/merchant-logo";

export interface MerchantProfileEditFormValues {
  businessName: string;
  description: string;
  address: string;
  phone: string;
  businessHours: string;
}

interface MerchantProfileEditFormProps {
  values: MerchantProfileEditFormValues;
  onChange: (values: MerchantProfileEditFormValues) => void;
  disabled?: boolean;
  logoPreviewUrl?: string | null;
  logoInputId?: string;
  onLogoChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function MerchantProfileEditForm({
  values,
  onChange,
  disabled = false,
  logoPreviewUrl,
  logoInputId,
  onLogoChange,
}: MerchantProfileEditFormProps) {
  function updateField<K extends keyof MerchantProfileEditFormValues>(
    key: K,
    value: MerchantProfileEditFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  const logoLabel = values.businessName.trim() || "商";

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">商家资料</h2>
        <p className="mt-1 text-xs text-zinc-400">
          以下信息会展示在公开商家主页，电话仅自己可见。
        </p>
      </div>

      {logoInputId && onLogoChange ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-700">商家 Logo</h3>
          <div className="mt-3 flex items-center gap-4">
            {logoPreviewUrl ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewUrl}
                  alt={logoLabel}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-bold text-amber-600 ring-1 ring-amber-200/70">
                {logoLabel.slice(0, 1)}
              </div>
            )}

            <label
              htmlFor={logoInputId}
              className="cursor-pointer rounded-full border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              更换 Logo
            </label>
            <input
              id={logoInputId}
              type="file"
              accept={MERCHANT_LOGO_ACCEPT}
              className="sr-only"
              disabled={disabled}
              onChange={onLogoChange}
            />
          </div>
        </div>
      ) : null}

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          商家名称
        </label>
        <input
          value={values.businessName}
          disabled={disabled}
          onChange={(event) => updateField("businessName", event.target.value)}
          placeholder="请输入商家名称"
          className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          商家简介
        </label>
        <textarea
          value={values.description}
          disabled={disabled}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="介绍你的商家"
          rows={4}
          className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-700">地址</label>
        <input
          value={values.address}
          disabled={disabled}
          onChange={(event) => updateField("address", event.target.value)}
          placeholder="商家地址"
          className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            营业时间
          </label>
          <input
            value={values.businessHours}
            disabled={disabled}
            onChange={(event) => updateField("businessHours", event.target.value)}
            placeholder="例如：10:00-22:00"
            className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            联系电话
          </label>
          <input
            value={values.phone}
            disabled={disabled}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="仅自己可见"
            className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-zinc-400">不会在公开商家主页展示</p>
        </div>
      </div>
    </section>
  );
}
