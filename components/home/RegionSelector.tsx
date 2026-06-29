"use client";

import { useEffect, useState } from "react";
import type { NearbyLocationStatus } from "@/lib/feed/use-nearby-location";
import {
  SELECTABLE_REGIONS,
  type LocationMode,
  type SelectedRegion,
} from "@/lib/feed/regions";

interface RegionSelectorProps {
  active: SelectedRegion;
  locationMode: LocationMode | null;
  locationStatus: NearbyLocationStatus;
  onManualSelect: (region: SelectedRegion) => void;
  onRetryLocate: () => void;
}

function getStatusMessage(
  active: SelectedRegion,
  locationMode: LocationMode | null,
  locationStatus: NearbyLocationStatus,
): string {
  if (locationStatus === "locating") {
    return "正在定位…";
  }

  if (locationStatus === "failed") {
    return "无法获取位置，可手动选择地区";
  }

  if (locationMode === "auto" || locationStatus === "success") {
    return `当前地区：${active}`;
  }

  return `当前地区：${active}`;
}

export default function RegionSelector({
  active,
  locationMode,
  locationStatus,
  onManualSelect,
  onRetryLocate,
}: RegionSelectorProps) {
  const [showManualOptions, setShowManualOptions] = useState(
    locationStatus === "failed" || locationMode === "manual",
  );

  useEffect(() => {
    if (locationStatus === "failed" || locationMode === "manual") {
      setShowManualOptions(true);
    }
  }, [locationStatus, locationMode]);

  const statusMessage = getStatusMessage(active, locationMode, locationStatus);
  const showRetry =
    locationStatus === "failed" ||
    locationMode === "manual" ||
    locationStatus === "success";

  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="mx-auto max-w-md space-y-2.5 px-4 py-2.5 lg:max-w-none lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-sm ${
              locationStatus === "failed"
                ? "text-amber-700"
                : locationStatus === "locating"
                  ? "text-zinc-500"
                  : "font-medium text-zinc-800"
            }`}
          >
            {statusMessage}
          </p>
          {showRetry ? (
            <button
              type="button"
              onClick={onRetryLocate}
              disabled={locationStatus === "locating"}
              className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 disabled:opacity-60"
            >
              {locationStatus === "locating" ? "定位中" : "重新定位"}
            </button>
          ) : null}
        </div>

        {!showManualOptions ? (
          <button
            type="button"
            onClick={() => setShowManualOptions(true)}
            className="text-xs font-medium text-rose-500"
          >
            手动选择地区
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">手动选择</span>
              {locationMode !== "manual" && locationStatus !== "failed" ? (
                <button
                  type="button"
                  onClick={() => setShowManualOptions(false)}
                  className="text-xs text-zinc-400"
                >
                  收起
                </button>
              ) : null}
            </div>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
              {SELECTABLE_REGIONS.map((region) => {
                const isActive = active === region;

                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => onManualSelect(region)}
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
        )}
      </div>
    </div>
  );
}
