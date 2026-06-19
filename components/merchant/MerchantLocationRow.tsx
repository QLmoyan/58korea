import MerchantNavigationLink from "@/components/merchant/MerchantNavigationLink";

interface MerchantLocationRowProps {
  location: string;
  trailing?: React.ReactNode;
  className?: string;
}

export default function MerchantLocationRow({
  location,
  trailing,
  className = "",
}: MerchantLocationRowProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <p className="text-xs text-zinc-400">
        <span aria-hidden="true">📍 </span>
        {location}
      </p>
      <MerchantNavigationLink location={location} />
      {trailing}
    </div>
  );
}
