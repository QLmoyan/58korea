"use client";

import { SELECTABLE_REGIONS, type SelectedRegion } from "@/lib/feed/regions";

interface RegionPickerSheetProps {
  open: boolean;
  active: SelectedRegion;
  onSelect: (region: SelectedRegion) => void;
  onClose: () => void;
}

export default function RegionPickerSheet({
  open,
  active,
  onSelect,
  onClose,
}: RegionPickerSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="关闭地区选择"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择地区"
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-white px-4 pt-4 pb-safe shadow-xl ring-1 ring-zinc-100"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">选择地区</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-zinc-500"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto pb-4">
          {SELECTABLE_REGIONS.map((region) => {
            const isActive = region === active;

            return (
              <button
                key={region}
                type="button"
                onClick={() => {
                  onSelect(region);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm touch-manipulation ${
                  isActive
                    ? "bg-rose-50 font-medium text-rose-600 ring-1 ring-rose-100"
                    : "bg-zinc-50 text-zinc-800"
                }`}
              >
                <span>{region}</span>
                {isActive ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
