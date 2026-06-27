import Image from "next/image";
import Link from "next/link";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import SearchHighlightText from "@/components/search/SearchHighlightText";
import type { SearchMerchantResult } from "@/lib/search/types";

interface SearchMerchantResultItemProps {
  merchant: SearchMerchantResult;
  highlightQuery?: string;
}

export default function SearchMerchantResultItem({
  merchant,
  highlightQuery = "",
}: SearchMerchantResultItemProps) {
  const avatarLabel = merchant.businessName.slice(0, 1);

  return (
    <Link
      href={merchant.profileHref}
      className="block border-b border-zinc-100 bg-white px-4 py-4 transition-colors hover:bg-zinc-50 lg:px-0"
    >
      <div className="flex items-start gap-3">
        {merchant.logoUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-amber-50 ring-1 ring-amber-200/70">
            <Image
              src={merchant.logoUrl}
              alt={merchant.businessName}
              fill
              className="object-cover"
              sizes="56px"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-base font-semibold text-amber-600 ring-1 ring-amber-200/70">
            {avatarLabel}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900">
              <SearchHighlightText
                text={merchant.businessName}
                query={highlightQuery}
              />
            </h3>
            <MerchantVerifiedBadge size="sm" />
          </div>

          {merchant.address?.trim() ? (
            <p className="mt-1 text-xs text-zinc-500">{merchant.address}</p>
          ) : null}

          {merchant.businessHours?.trim() ? (
            <p className="mt-1 text-xs text-zinc-400">
              营业时间：{merchant.businessHours}
            </p>
          ) : null}

          {merchant.description?.trim() ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
              <SearchHighlightText
                text={merchant.description}
                query={highlightQuery}
              />
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
