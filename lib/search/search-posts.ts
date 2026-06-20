import type { Post } from "@/lib/data/posts";
import { fetchPublishedPostsByNewest } from "@/lib/supabase/queries";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { isSearchQueryEmpty, normalizeSearchQuery } from "./normalize-query";
import { postMatchesQuery, sortPostsByNewest } from "./match-post";

export async function searchPosts(query: string): Promise<Post[]> {
  const normalized = normalizeSearchQuery(query);

  if (isSearchQueryEmpty(normalized)) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  const needle = normalized.toLowerCase();
  const posts = await fetchPublishedPostsByNewest();

  return sortPostsByNewest(posts.filter((post) => postMatchesQuery(post, needle)));
}
