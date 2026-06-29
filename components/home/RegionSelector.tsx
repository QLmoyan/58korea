import {
  SELECTABLE_REGIONS,
  type SelectedRegion,
} from "@/lib/feed/regions";

interface RegionSelectorProps {
  active: SelectedRegion;
  onChange: (region: SelectedRegion) => void;
}

export default function RegionSelector({ active, onChange }: RegionSelectorProps) {
  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5 lg:max-w-none lg:px-6">
        <span className="shrink-0 text-xs font-medium text-zinc-500">地区</span>
        <div className="scrollbar-hide flex flex-1 gap-2 overflow-x-auto">
          {SELECTABLE_REGIONS.map((region) => {
            const isActive = active === region;

            return (
              <button
                key={region}
                type="button"
                onClick={() => onChange(region)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
