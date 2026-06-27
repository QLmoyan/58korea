import type { Post } from "@/lib/data/posts";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  mapPostRow,
  POST_SELECT_FOR_PROFILE_FEED,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";

export interface ViewedPostEntry {
  post: Post;
  viewedAt: string;
}

export async function fetchViewedPosts(userId: string): Promise<ViewedPostEntry[]> {
  const supabase = getSupabaseClient();
  const { data: views, error: viewsError } = await supabase
    .from("post_views")
    .select("post_id, viewed_at")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false });

  if (viewsError) {
    throw new Error(viewsError.message);
  }

  const entries = views ?? [];
  if (entries.length === 0) {
    return [];
  }

  const postIds = entries.map((row) => row.post_id);
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

  return entries
    .map((entry) => {
      const post = postsById.get(entry.post_id);
      if (!post) {
        return null;
      }

      return {
        post,
        viewedAt: entry.viewed_at,
      };
    })
    .filter((entry): entry is ViewedPostEntry => Boolean(entry));
}
