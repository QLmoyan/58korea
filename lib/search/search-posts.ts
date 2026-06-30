import type { Post } from "@/lib/data/posts";
import {
  mapPostRow,
  POST_SELECT_WITH_LINKED_COUPON,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildIlikeOrFilter,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/escape-ilike";
import { filterPostsByPlace } from "@/lib/search/filter-by-place";
import { scorePostMatch, sortBySearchRank } from "@/lib/search/match-score";
import { isSearchQueryEmpty, normalizeSearchQuery } from "./normalize-query";

/** @alias Post — search result row for the all-tab feed */
export type SearchPostResult = Post;

export type SearchPostsSortMode = "recommend" | "latest";

export interface SearchPostsOptions {
  keyword: string;
  place?: string | null;
  sortMode?: SearchPostsSortMode;
}

function sortPosts(
  posts: Post[],
  keyword: string,
  sortMode: SearchPostsSortMode,
): Post[] {
  if (sortMode === "latest") {
    return posts.slice().sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
  }

  if (isSearchQueryEmpty(keyword)) {
    return posts.slice().sort((left, right) => {
      const leftScore =
        (left.likes ?? 0) * 10 + (left.createdAt ? Date.parse(left.createdAt) : 0) / 1_000_000;
      const rightScore =
        (right.likes ?? 0) * 10 + (right.createdAt ? Date.parse(right.createdAt) : 0) / 1_000_000;
      return rightScore - leftScore;
    });
  }

  return sortBySearchRank(posts, {
    scoreOf: (post) => scorePostMatch(post, keyword),
    timestampOf: (post) => post.createdAt ?? post.id,
  });
}

export async function searchPosts(
  queryOrOptions: string | SearchPostsOptions,
): Promise<SearchPostResult[]> {
  const options: SearchPostsOptions =
    typeof queryOrOptions === "string"
      ? { keyword: queryOrOptions }
      : queryOrOptions;

  const keyword = normalizeSearchQuery(options.keyword);
  const place = options.place?.trim() || null;
  const sortMode = options.sortMode ?? "recommend";

  if (isSearchQueryEmpty(keyword) && !place) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON)
    .eq("moderation_status", "published");

  if (!isSearchQueryEmpty(keyword)) {
    const patternFilter = buildIlikeOrFilter(
      ["title", "content", "author"],
      keyword,
    );
    if (!patternFilter) {
      return [];
    }
    query = query.or(patternFilter);
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(SEARCH_RESULT_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const posts = (data ?? []).map((row) => mapPostRow(row as DbPostWithRelations));
  const filtered = filterPostsByPlace(posts, place);

  return sortPosts(filtered, keyword, sortMode);
}
