import type { Post } from "@/lib/data/posts";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  mapPostRow,
  POST_SELECT_FOR_PROFILE_FEED,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";

export async function fetchUserLikedPostIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.post_id);
}

export async function fetchUserFavoritedPostIds(userId: string): Promise<number[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("post_favorites")
    .select("post_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.post_id);
}

export async function fetchFavoritedPosts(userId: string): Promise<Post[]> {
  const postIds = await fetchUserFavoritedPostIds(userId);
  if (postIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_FOR_PROFILE_FEED)
    .in("id", postIds)
    .eq("moderation_status", "published");

  if (error) {
    throw new Error(error.message);
  }

  const postsById = new Map(
    (data ?? []).map((row) => [
      row.id,
      mapPostRow(row as DbPostWithRelations),
    ]),
  );

  return postIds
    .map((id) => postsById.get(id))
    .filter((post): post is Post => Boolean(post));
}
