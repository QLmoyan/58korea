import { SELECTABLE_REGIONS } from "@/lib/feed/regions";

/** First-batch place keywords for Search Context MVP (no DB). */
export const SEARCH_AREA_KEYWORDS = [
  "建大",
  "弘大",
  "新村",
  "江南",
  "明洞",
  "东大门",
  "梨泰院",
  "蚕室",
  "永登浦",
  "九老",
  "大林",
  "安山",
  "水原",
  "富平",
  "松岛",
  "西面",
  "海云台",
] as const;

/** Longest-first place dictionary for query parsing. */
export const SEARCH_PLACE_KEYWORDS: readonly string[] = [
  ...SEARCH_AREA_KEYWORDS,
  ...SELECTABLE_REGIONS,
].sort((left, right) => right.length - left.length);
