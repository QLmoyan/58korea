export const SELECTED_REGION_STORAGE_KEY = "hanquan:selected-region";

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
