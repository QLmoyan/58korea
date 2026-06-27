import { FEED_PAGE_SIZE } from "@/lib/constants/network";
import type { Post, PostCategory, PostDistance, PostImage } from "@/lib/data/posts";
import type { Comment } from "@/lib/types/community";
import { sortPostsWithMerchantsFirst } from "@/lib/merchant/sort-posts";
import {
  COMMENT_SELECT_WITH_IMAGES,
  mapCommentRow,
  type DbCommentWithImages,
} from "@/lib/supabase/comment-mapper";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import {
  mapPostRow,
  POST_SELECT_WITH_LINKED_COUPON,
  POST_SELECT_WITH_LINKED_COUPON_SINGLE,
  type DbPostWithRelations,
} from "@/lib/supabase/post-mapper";

type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type DbPostImage = Database["public"]["Tables"]["post_images"]["Row"];
type DbPostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type DbCommentInsert = Database["public"]["Tables"]["comments"]["Insert"];

function mapComment(row: DbCommentWithImages): Comment {
  return mapCommentRow(row);
}

function mapPost(row: DbPostWithRelations, images?: PostImage[]): Post {
  return mapPostRow(row, images);
}

function mapPostImage(row: DbPostImage): PostImage {
  return {
    id: row.id,
    url: row.public_url,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
  };
}

async function fetchPublishedPostRows(): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPost(row as DbPostWithRelations));
}

export async function fetchPosts(): Promise<Post[]> {
  return sortPostsWithMerchantsFirst(await fetchPublishedPostRows());
}

export async function fetchPublishedPostsByNewest(): Promise<Post[]> {
  return fetchPublishedPostRows();
}

export async function fetchPostById(postId: number): Promise<Post | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON_SINGLE)
    .eq("id", postId)
    .eq("moderation_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const images = await fetchPostImagesByPostId(postId);
  return mapPost(data as DbPostWithRelations, images);
}

export async function fetchPostImagesByPostId(postId: number): Promise<PostImage[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("post_images")
    .select("*")
    .eq("post_id", postId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPostImage);
}

export async function fetchCommentsByPostId(postId: number): Promise<Comment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT_WITH_IMAGES)
    .eq("post_id", postId)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapComment(row as DbCommentWithImages));
}

export async function insertPost(input: DbPostInsert): Promise<Post> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapPost(data);
}

export async function insertComment(input: DbCommentInsert): Promise<Comment> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapComment(data);
}

export async function fetchCommentById(commentId: string): Promise<Comment | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("id", commentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapComment(data) : null;
}

export async function deletePostById(postId: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCommentById(commentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) {
    throw new Error(error.message);
  }
}
