import type { Post } from "@/lib/data/posts";
import type { SearchMerchantResult } from "@/lib/search/types";

export function textContainsPlace(
  value: string | null | undefined,
  place: string,
): boolean {
  const haystack = value?.trim() ?? "";
  if (!haystack || !place) {
    return false;
  }

  return haystack.includes(place);
}

export function postMatchesSearchPlace(post: Post, place: string): boolean {
  return textContainsPlace(post.location, place);
}

export function merchantMatchesSearchPlace(
  merchant: SearchMerchantResult,
  place: string,
): boolean {
  return textContainsPlace(merchant.address, place);
}

export function filterPostsByPlace(posts: Post[], place: string | null): Post[] {
  if (!place) {
    return posts;
  }

  return posts.filter((post) => postMatchesSearchPlace(post, place));
}

export function filterMerchantsByPlace(
  merchants: SearchMerchantResult[],
  place: string | null,
): SearchMerchantResult[] {
  if (!place) {
    return merchants;
  }

  return merchants.filter((merchant) => merchantMatchesSearchPlace(merchant, place));
}
