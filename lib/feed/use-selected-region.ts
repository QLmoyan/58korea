"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SELECTED_REGION,
  type SelectedRegion,
} from "@/lib/feed/regions";
import { loadSelectedRegion, saveSelectedRegion } from "@/lib/feed/selected-region";

export function useSelectedRegion() {
  const [region, setRegion] = useState<SelectedRegion>(DEFAULT_SELECTED_REGION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRegion(loadSelectedRegion());
    setHydrated(true);
  }, []);

  const setSelectedRegion = useCallback((next: SelectedRegion) => {
    setRegion(next);
    saveSelectedRegion(next);
  }, []);

  return { region, setSelectedRegion, hydrated };
}
