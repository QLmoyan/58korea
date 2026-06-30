import type { FeedChannel } from "@/lib/data/posts";
import type { SelectedRegion } from "@/lib/feed/regions";
import { normalizeSearchQuery } from "@/lib/search/normalize-query";

export function buildSearchHref(
  rawQuery: string,
  channel: FeedChannel = "推荐",
  region?: SelectedRegion,
): string {
  const normalized = normalizeSearchQuery(rawQuery);

  if (!normalized) {
    return "/search";
  }

  const params = new URLSearchParams();
  params.set("q", normalized);

  if (channel !== "推荐") {
    params.set("channel", channel);
  }

  if (channel === "附近" && region) {
    params.set("region", region);
  }

  return `/search?${params.toString()}`;
}
