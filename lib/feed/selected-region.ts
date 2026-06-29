import {
  DEFAULT_SELECTED_REGION,
  LOCATION_MODE_STORAGE_KEY,
  SELECTED_REGION_STORAGE_KEY,
  type LocationMode,
  type SelectedRegion,
  isLocationMode,
  isSelectedRegion,
} from "@/lib/feed/regions";

export function hasPersistedSelectedRegion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return isSelectedRegion(
    window.localStorage.getItem(SELECTED_REGION_STORAGE_KEY),
  );
}

export function loadSelectedRegion(): SelectedRegion {
  if (typeof window === "undefined") {
    return DEFAULT_SELECTED_REGION;
  }

  const raw = window.localStorage.getItem(SELECTED_REGION_STORAGE_KEY);
  return isSelectedRegion(raw) ? raw : DEFAULT_SELECTED_REGION;
}

export function saveSelectedRegion(region: SelectedRegion) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SELECTED_REGION_STORAGE_KEY, region);
}

export function loadLocationMode(): LocationMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOCATION_MODE_STORAGE_KEY);
  return isLocationMode(raw) ? raw : null;
}

export function saveLocationMode(mode: LocationMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCATION_MODE_STORAGE_KEY, mode);
}

export function saveAutoSelectedRegion(region: SelectedRegion) {
  saveSelectedRegion(region);
  saveLocationMode("auto");
}

export function saveManualSelectedRegion(region: SelectedRegion) {
  saveSelectedRegion(region);
  saveLocationMode("manual");
}
