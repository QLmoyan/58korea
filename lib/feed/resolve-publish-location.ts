import type { SelectedRegion } from "@/lib/feed/regions";

/** Map selected region to post.location (no free-text input). */
export function resolvePublishLocation(region: SelectedRegion): string {
  return region;
}
