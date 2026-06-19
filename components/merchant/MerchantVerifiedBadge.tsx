interface MerchantVerifiedBadgeProps {
  size?: "sm" | "md";
}

export default function MerchantVerifiedBadge({
  size = "md",
}: MerchantVerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 font-semibold text-amber-700 ring-1 ring-amber-200/80 ${
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px] leading-none"
          : "px-2 py-0.5 text-[11px] leading-none"
      }`}
    >
      ⭐认证商家
    </span>
  );
}
