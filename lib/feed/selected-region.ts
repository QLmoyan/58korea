import {
  DEFAULT_SELECTED_REGION,
  SELECTED_REGION_STORAGE_KEY,
  type SelectedRegion,
  isSelectedRegion,
} from "@/lib/feed/regions";

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
