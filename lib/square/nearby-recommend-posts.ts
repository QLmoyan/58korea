import type { Post } from "@/lib/data/posts";
import { resolvePostThumbnailUrl } from "@/lib/square/post-list-utils";

export const SQUARE_LIST_INSERT_AFTER = 7;
export const MIN_NEARBY_RECOMMEND_POSTS = 2;
export const MAX_NEARBY_RECOMMEND_POSTS = 8;

function compareNearbyRecommendPosts(left: Post, right: Post): number {
  const leftNearby = left.nearby ? 1 : 0;
  const rightNearby = right.nearby ? 1 : 0;

  if (leftNearby !== rightNearby) {
    return rightNearby - leftNearby;
  }

  const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;

  return rightTime - leftTime;
}

export function pickNearbyRecommendPosts(
  filteredPosts: Post[],
  listPosts: Post[],
): Post[] {
  const excludeIds = new Set(
    listPosts.slice(0, SQUARE_LIST_INSERT_AFTER).map((post) => post.id),
  );

  const candidates = filteredPosts
    .filter(
      (post) =>
        !excludeIds.has(post.id) && Boolean(resolvePostThumbnailUrl(post)),
    )
    .sort(compareNearbyRecommendPosts)
    .slice(0, MAX_NEARBY_RECOMMEND_POSTS);

  if (candidates.length < MIN_NEARBY_RECOMMEND_POSTS) {
    return [];
  }

  return candidates;
}

export function formatNearbyRecommendLocation(location: string | undefined): string {
  const trimmed = location?.trim();
  return trimmed || "未标注位置";
}
