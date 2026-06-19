import MerchantNavigationLink from "@/components/merchant/MerchantNavigationLink";

interface MerchantDetailTitleMetaProps {
  title: string;
  location?: string;
  isMerchant: boolean;
  titleClassName?: string;
}

export default function MerchantDetailTitleMeta({
  title,
  location,
  isMerchant,
  titleClassName = "text-xl font-bold leading-snug text-zinc-900",
}: MerchantDetailTitleMetaProps) {
  const locationLabel = location?.trim();

  if (!isMerchant) {
    return (
      <>
        <h1 className={titleClassName}>{title}</h1>
        {locationLabel ? (
          <p className="text-xs text-zinc-400">📍 {locationLabel}</p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
        <h1 className={titleClassName}>{title}</h1>
        <span className="shrink-0 pt-1 text-sm font-semibold leading-none text-amber-500">
          ⭐ 认证商家
        </span>
      </div>

      {locationLabel ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs text-zinc-400">
            <span aria-hidden="true">📍 </span>
            {locationLabel}
          </p>
          <MerchantNavigationLink location={locationLabel} />
        </div>
      ) : null}
    </>
  );
}
