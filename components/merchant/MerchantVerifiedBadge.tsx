interface MerchantVerifiedBadgeProps {
  size?: "sm" | "md";
}

export default function MerchantVerifiedBadge({
  size = "md",
}: MerchantVerifiedBadgeProps) {
  const className =
    size === "sm"
      ? "inline-flex shrink-0 items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-amber-600 ring-1 ring-amber-200/80"
      : "inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold leading-none text-amber-600 ring-1 ring-amber-200/80";

  return <span className={className}>⭐认证商家</span>;
}
