"use client";

import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import ShareButton from "@/components/share/ShareButton";
import { buildProfileSharePath } from "@/lib/share/paths";
import type { MerchantProfile } from "@/lib/types/merchant";

interface ProfilePublicHeaderProps {
  username: string;
  displayName: string;
  bio: string;
  avatarLabel: string;
  avatarUrl?: string | null;
  isMerchant: boolean;
  merchantDetails?: MerchantProfile | null;
  layout?: "mobile" | "desktop";
}

function MerchantInfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-600">{value}</dd>
    </div>
  );
}

export default function ProfilePublicHeader({
  username,
  displayName,
  bio,
  avatarLabel,
  avatarUrl,
  isMerchant,
  merchantDetails,
  layout = "mobile",
}: ProfilePublicHeaderProps) {
  const isDesktop = layout === "desktop";

  return (
    <section
      className={
        isDesktop
          ? "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100"
          : "border-b border-zinc-100 bg-white px-4 pb-5 pt-2"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-4">
        {avatarUrl ? (
          <div
            className={
              isMerchant
                ? "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200/70 lg:h-20 lg:w-20"
                : "relative h-16 w-16 shrink-0 overflow-hidden rounded-full lg:h-20 lg:w-20"
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
          <div
            className={
              isMerchant
                ? "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl font-bold text-amber-600 ring-1 ring-amber-200/70 lg:h-20 lg:w-20 lg:text-2xl"
                : "flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xl font-bold text-white lg:h-20 lg:w-20 lg:text-2xl"
            }
          >
            {avatarLabel.slice(0, 1)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-zinc-900 lg:text-xl">
              {displayName}
            </h1>
            {isMerchant ? <MerchantVerifiedBadge size="sm" /> : null}
          </div>

          {isMerchant ? (
            <p className="mt-1 text-xs text-zinc-400">商家主页</p>
          ) : null}

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {bio || "还没有简介"}
          </p>

          {isMerchant && merchantDetails ? (
            <dl className="mt-4 space-y-2">
              <MerchantInfoItem label="地址" value={merchantDetails.address} />
              <MerchantInfoItem
                label="营业时间"
                value={merchantDetails.businessHours}
              />
            </dl>
          ) : null}
        </div>
        </div>

        <ShareButton
          variant="pill"
          path={buildProfileSharePath(username)}
          title={displayName}
          text={
            isMerchant
              ? `${displayName} 的商家主页`
              : `${displayName} 的主页`
          }
        />
      </div>
    </section>
  );
}
