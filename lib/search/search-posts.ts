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
import { scorePostMatch, sortBySearchRank } from "@/lib/search/match-score";
import { isSearchQueryEmpty, normalizeSearchQuery } from "./normalize-query";

/** @alias Post — search result row for the all-tab feed */
export type SearchPostResult = Post;

export async function searchPosts(query: string): Promise<SearchPostResult[]> {
  const normalized = normalizeSearchQuery(query);

  if (isSearchQueryEmpty(normalized) || !isSupabaseConfigured()) {
    return [];
  }

  const patternFilter = buildIlikeOrFilter(
    ["title", "content", "author"],
    normalized,
  );
  if (!patternFilter) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON)
    .eq("moderation_status", "published")
    .or(patternFilter)
    .limit(SEARCH_RESULT_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const posts = (data ?? []).map((row) => mapPostRow(row as DbPostWithRelations));

  return sortBySearchRank(posts, {
    scoreOf: (post) => scorePostMatch(post, normalized),
    timestampOf: (post) => post.createdAt ?? post.id,
  });
}
