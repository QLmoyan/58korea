import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMMENT_SELECT_WITH_IMAGES,
  mapCommentRow,
  type DbCommentWithImages,
} from "@/lib/supabase/comment-mapper";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import type { Comment } from "@/lib/types/community";

export const PROFILE_COMMENTS_PAGE_SIZE = 20;

export interface ProfileCommentPostSummary {
  id: number;
  title: string;
}

export interface ProfileCommentEntry {
  comment: Comment;
  post: ProfileCommentPostSummary | null;
}

export interface FetchUserProfileCommentsResult {
  entries: ProfileCommentEntry[];
  hasMore: boolean;
}

export interface FetchUserProfileCommentsOptions {
  userId: string;
  limit?: number;
  offset?: number;
  client?: SupabaseClient<Database>;
}

export async function fetchUserProfileComments(
  options: FetchUserProfileCommentsOptions,
): Promise<FetchUserProfileCommentsResult> {
  const { userId, limit = PROFILE_COMMENTS_PAGE_SIZE, offset = 0 } = options;
  const supabase = options.client ?? getSupabaseClient();
  const fetchCount = limit + 1;

  const { data: commentRows, error: commentsError } = await supabase
    .from("comments")
    .select(COMMENT_SELECT_WITH_IMAGES)
    .eq("user_id", userId)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + fetchCount - 1);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const rows = (commentRows ?? []) as DbCommentWithImages[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  if (pageRows.length === 0) {
    return { entries: [], hasMore: false };
  }

  const postIds = [...new Set(pageRows.map((row) => row.post_id))];
  const { data: postRows, error: postsError } = await supabase
    .from("posts")
    .select("id, title")
    .in("id", postIds)
    .eq("moderation_status", "published");

  if (postsError) {
    throw new Error(postsError.message);
  }

  const postsById = new Map(
    (postRows ?? []).map((row) => [row.id, { id: row.id, title: row.title }]),
  );

  const entries = pageRows.map((row) => ({
    comment: mapCommentRow(row),
    post: postsById.get(row.post_id) ?? null,
  }));

  return { entries, hasMore };
}
