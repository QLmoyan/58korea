"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import RegionPickerSheet from "@/components/posts/RegionPickerSheet";
import { resolvePublishLocation } from "@/lib/feed/resolve-publish-location";
import type { SelectedRegion } from "@/lib/feed/regions";
import { useNearbyLocation } from "@/lib/feed/use-nearby-location";
import { useSelectedRegion } from "@/lib/feed/use-selected-region";

interface PublishLocationSectionProps {
  disabled?: boolean;
  onLocationChange: (location: string) => void;
}

export default function PublishLocationSection({
  disabled = false,
  onLocationChange,
}: PublishLocationSectionProps) {
  const {
    region,
    locationMode,
    hasPersistedRegion,
    hydrated,
    applyAutoRegion,
    selectRegionManually,
    enableAutoMode,
  } = useSelectedRegion();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [showRegionPickerAction, setShowRegionPickerAction] = useState(false);
  const userRetriedLocateRef = useRef(false);

  const handleRegionResolved = useCallback(
    (nextRegion: SelectedRegion) => {
      applyAutoRegion(nextRegion);
      setShowRegionPickerAction(false);
      onLocationChange(resolvePublishLocation(nextRegion));
    },
    [applyAutoRegion, onLocationChange],
  );

  const { status: locationStatus, requestLocation, retryLocation } =
    useNearbyLocation({
      onRegionResolved: handleRegionResolved,
    });

  const hasResolvedLocation =
    hasPersistedRegion ||
    locationStatus === "success" ||
    locationMode === "manual";

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (hasPersistedRegion) {
      onLocationChange(resolvePublishLocation(region));
      return;
    }

    if (locationMode === "manual") {
      return;
    }

    requestLocation();
  }, [
    hydrated,
    hasPersistedRegion,
    locationMode,
    region,
    onLocationChange,
    requestLocation,
  ]);

  useEffect(() => {
    if (locationStatus === "failed" && userRetriedLocateRef.current) {
      setShowRegionPickerAction(true);
    }
  }, [locationStatus]);

  function handleRetryLocate() {
    userRetriedLocateRef.current = true;
    enableAutoMode();
    retryLocation();
  }

  function handleManualSelect(nextRegion: SelectedRegion) {
    selectRegionManually(nextRegion);
    setShowRegionPickerAction(false);
    onLocationChange(resolvePublishLocation(nextRegion));
  }

  function renderLocationLabel() {
    if (!hydrated || locationStatus === "locating") {
      return "正在定位…";
    }

    if (!hasResolvedLocation && locationStatus === "failed") {
      return "无法获取位置";
    }

    return resolvePublishLocation(region);
  }

  const showRetry = hydrated && (locationStatus !== "idle" || hasPersistedRegion);

  return (
    <>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <p className="mb-2 text-sm font-medium text-zinc-700">当前地区</p>
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-sm leading-6 ${
              !hasResolvedLocation && locationStatus === "failed"
                ? "text-amber-700"
                : "text-zinc-800"
            }`}
          >
            <span aria-hidden="true">📍 </span>
            {renderLocationLabel()}
          </p>
          {showRetry ? (
            <button
              type="button"
              onClick={handleRetryLocate}
              disabled={disabled || locationStatus === "locating"}
              className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 disabled:opacity-60"
            >
              {locationStatus === "locating" ? "定位中" : "重新定位"}
            </button>
          ) : null}
        </div>

        {showRegionPickerAction ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setSheetOpen(true)}
            className="mt-3 text-sm font-medium text-rose-500 disabled:opacity-60"
          >
            选择地区
          </button>
        ) : null}

        {!hasResolvedLocation && locationStatus === "failed" ? (
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            请重新定位，或选择你所在的地区后再发布
          </p>
        ) : (
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            帖子将标记为该地区，方便同城用户在「附近」找到
          </p>
        )}
      </section>

      <RegionPickerSheet
        open={sheetOpen}
        active={region}
        onSelect={handleManualSelect}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
