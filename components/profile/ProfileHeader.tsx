"use client";

import { useEffect, useRef, useState } from "react";
import MerchantCouponRedeemForm from "@/components/merchant/MerchantCouponRedeemForm";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import type { MerchantProfile } from "@/lib/types/merchant";

interface ProfileHeaderProps {
  displayName: string;
  bio: string;
  avatarLabel: string;
  avatarUrl?: string | null;
  isMerchant: boolean;
  merchantDetails?: MerchantProfile | null;
  merchantDetailsLoading?: boolean;
  onEditProfile: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  signOutError?: string;
  layout?: "mobile" | "desktop";
}

function MerchantInfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-600">{value?.trim() || "未填写"}</dd>
    </div>
  );
}

export default function ProfileHeader({
  displayName,
  bio,
  avatarLabel,
  avatarUrl,
  isMerchant,
  merchantDetails,
  merchantDetailsLoading = false,
  onEditProfile,
  onSignOut,
  signingOut,
  signOutError,
  layout = "mobile",
}: ProfileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDesktop = layout === "desktop";
  const showMerchantInfo = isMerchant;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <section
      className={
        isDesktop
          ? "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100"
          : "border-b border-zinc-100 bg-white px-4 pb-5 pt-2"
      }
    >
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <div
            className={
              showMerchantInfo
                ? "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200/70 lg:h-20 lg:w-20"
                : "relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 lg:h-20 lg:w-20"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xl font-bold text-white lg:h-20 lg:w-20 lg:text-2xl">
            {avatarLabel.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-zinc-900 lg:text-xl">
                  {displayName}
                </h1>
                {showMerchantInfo ? <MerchantVerifiedBadge size="sm" /> : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onEditProfile}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                编辑资料
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100"
                  aria-label="设置"
                  aria-expanded={menuOpen}
                >
                  <SettingsIcon />
                </button>

                {menuOpen ? (
                  <div className="absolute top-9 right-0 z-20 min-w-[120px] overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                      disabled={signingOut}
                      className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      {signingOut ? "退出中..." : "退出登录"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {bio || "还没有简介"}
          </p>

          {showMerchantInfo ? (
            <div className="mt-4 space-y-4">
              {merchantDetailsLoading ? (
                <p className="text-xs text-zinc-400">商家信息加载中...</p>
              ) : (
                <dl className="space-y-2">
                  <MerchantInfoItem label="地址" value={merchantDetails?.address} />
                  <MerchantInfoItem
                    label="营业时间"
                    value={merchantDetails?.businessHours}
                  />
                  <MerchantInfoItem label="电话" value={merchantDetails?.phone} />
                </dl>
              )}

              <MerchantCouponRedeemForm />
            </div>
          ) : null}

          {signOutError ? (
            <p className="mt-2 text-xs text-rose-500">{signOutError}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
