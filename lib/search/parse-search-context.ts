import type { FeedChannel } from "@/lib/data/posts";
import {
  DEFAULT_SELECTED_REGION,
  type SelectedRegion,
  isSelectedRegion,
} from "@/lib/feed/regions";
import { normalizeSearchQuery } from "@/lib/search/normalize-query";
import { SEARCH_PLACE_KEYWORDS } from "@/lib/search/place-keywords";

export type SearchContextSource =
  | "query-place"
  | "nearby-context"
  | "global-recommend"
  | "global-latest";

export interface ParsedSearchContext {
  keyword: string;
  place: string | null;
  source: SearchContextSource;
  displayLabel: string;
}

export interface ParseSearchContextInput {
  rawQuery: string;
  currentChannel: FeedChannel;
  selectedRegion: SelectedRegion;
}

function extractPlaceFromQuery(query: string): {
  place: string | null;
  keyword: string;
} {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return { place: null, keyword: "" };
  }

  for (const placeKeyword of SEARCH_PLACE_KEYWORDS) {
    const index = normalized.indexOf(placeKeyword);
    if (index === -1) {
      continue;
    }

    const before = normalized.slice(0, index).trim();
    const after = normalized.slice(index + placeKeyword.length).trim();
    const keyword = [before, after].filter(Boolean).join(" ").trim();

    return { place: placeKeyword, keyword };
  }

  return { place: null, keyword: normalized };
}

function buildDisplayLabel(
  source: SearchContextSource,
  place: string | null,
  keyword: string,
): string {
  const term = keyword || "全部";

  switch (source) {
    case "query-place":
      return `📍 ${place ?? ""} · ${term}`;
    case "nearby-context":
      return `📍 ${place ?? ""}附近 · ${term}`;
    case "global-recommend":
      return `⭐ 推荐 · ${term}`;
    case "global-latest":
      return `🕒 最新 · ${term}`;
  }
}

export function parseSearchContext(
  input: ParseSearchContextInput,
): ParsedSearchContext {
  const { place: queryPlace, keyword } = extractPlaceFromQuery(input.rawQuery);

  if (queryPlace) {
    const source: SearchContextSource = "query-place";
    return {
      keyword,
      place: queryPlace,
      source,
      displayLabel: buildDisplayLabel(source, queryPlace, keyword),
    };
  }

  if (input.currentChannel === "附近") {
    const place = input.selectedRegion;
    const source: SearchContextSource = "nearby-context";
    return {
      keyword,
      place,
      source,
      displayLabel: buildDisplayLabel(source, place, keyword),
    };
  }

  if (input.currentChannel === "最新") {
    const source: SearchContextSource = "global-latest";
    return {
      keyword,
      place: null,
      source,
      displayLabel: buildDisplayLabel(source, null, keyword),
    };
  }

  const source: SearchContextSource = "global-recommend";
  return {
    keyword,
    place: null,
    source,
    displayLabel: buildDisplayLabel(source, null, keyword),
  };
}

export function parseSearchChannelParam(
  value: string | null | undefined,
): FeedChannel {
  if (value === "附近" || value === "nearby") {
    return "附近";
  }

  if (value === "最新" || value === "latest") {
    return "最新";
  }

  if (value === "推荐" || value === "recommend") {
    return "推荐";
  }

  return "推荐";
}

export function parseSearchRegionParam(
  value: string | null | undefined,
): SelectedRegion {
  return isSelectedRegion(value) ? value : DEFAULT_SELECTED_REGION;
}
