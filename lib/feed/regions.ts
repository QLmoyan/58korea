export const SELECTED_REGION_STORAGE_KEY = "hanquan:selected-region";
export const LOCATION_MODE_STORAGE_KEY = "hanquan:location-mode";

export const LOCATION_MODES = ["auto", "manual"] as const;
export type LocationMode = (typeof LOCATION_MODES)[number];

export function isLocationMode(
  value: string | null | undefined,
): value is LocationMode {
  return (
    value != null && (LOCATION_MODES as readonly string[]).includes(value)
  );
}

export const SELECTABLE_REGIONS = [
  "首尔",
  "釜山",
  "仁川",
  "大邱",
  "大田",
  "光州",
  "济州",
  "京畿",
  "其他",
] as const;

export type SelectedRegion = (typeof SELECTABLE_REGIONS)[number];

export const DEFAULT_SELECTED_REGION: SelectedRegion = "首尔";

/** Regions used for matching; excludes 「其他」. */
export const MATCHABLE_REGIONS: readonly SelectedRegion[] = SELECTABLE_REGIONS.filter(
  (region) => region !== "其他",
);

export function isSelectedRegion(value: string | null | undefined): value is SelectedRegion {
  return (
    value != null &&
    (SELECTABLE_REGIONS as readonly string[]).includes(value)
  );
}
