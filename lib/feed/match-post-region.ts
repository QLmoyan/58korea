import type { Post } from "@/lib/data/posts";
import {
  MATCHABLE_REGIONS,
  type SelectedRegion,
} from "@/lib/feed/regions";

function normalizeLocation(location: string | null | undefined): string {
  return location?.trim() ?? "";
}

export function postMatchesSelectedRegion(
  post: Post,
  selectedRegion: SelectedRegion,
): boolean {
  const location = normalizeLocation(post.location);
  if (!location) {
    return false;
  }

  if (selectedRegion === "其他") {
    return !MATCHABLE_REGIONS.some((region) => location.includes(region));
  }

  return location.includes(selectedRegion);
}
