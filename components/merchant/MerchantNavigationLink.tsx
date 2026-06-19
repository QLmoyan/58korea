"use client";

import Link from "next/link";
import { buildMerchantNavigationHref } from "@/lib/merchant/identify";

interface MerchantNavigationLinkProps {
  location: string;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function MerchantNavigationLink({
  location,
  className = "",
  onClick,
}: MerchantNavigationLinkProps) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    onClick?.(event);
  }

  return (
    <Link
      href={buildMerchantNavigationHref(location)}
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600 ring-1 ring-sky-100 transition-colors hover:bg-sky-100 lg:text-[11px] ${className}`}
    >
      一键导航
    </Link>
  );
}
