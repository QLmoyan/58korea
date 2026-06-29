"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SELECTED_REGION,
  type LocationMode,
  type SelectedRegion,
} from "@/lib/feed/regions";
import {
  hasPersistedSelectedRegion,
  loadLocationMode,
  loadSelectedRegion,
  saveAutoSelectedRegion,
  saveLocationMode,
  saveManualSelectedRegion,
} from "@/lib/feed/selected-region";

export function useSelectedRegion() {
  const [region, setRegion] = useState<SelectedRegion>(DEFAULT_SELECTED_REGION);
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null);
  const [hasPersistedRegion, setHasPersistedRegion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRegion(loadSelectedRegion());
    setLocationMode(loadLocationMode());
    setHasPersistedRegion(hasPersistedSelectedRegion());
    setHydrated(true);
  }, []);

  const applyAutoRegion = useCallback((next: SelectedRegion) => {
    setRegion(next);
    setLocationMode("auto");
    setHasPersistedRegion(true);
    saveAutoSelectedRegion(next);
  }, []);

  const selectRegionManually = useCallback((next: SelectedRegion) => {
    setRegion(next);
    setLocationMode("manual");
    setHasPersistedRegion(true);
    saveManualSelectedRegion(next);
  }, []);

  const enableAutoMode = useCallback(() => {
    setLocationMode("auto");
    saveLocationMode("auto");
  }, []);

  return {
    region,
    locationMode,
    hasPersistedRegion,
    hydrated,
    applyAutoRegion,
    selectRegionManually,
    enableAutoMode,
  };
}
