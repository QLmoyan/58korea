import type { Post, PostCategory, PostDistance, PostImage } from "@/lib/data/posts";
import type { Comment } from "@/lib/types/community";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type DbPost = Database["public"]["Tables"]["posts"]["Row"];
type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type DbPostImage = Database["public"]["Tables"]["post_images"]["Row"];
type DbPostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type DbCommentInsert = Database["public"]["Tables"]["comments"]["Insert"];

type DbPostImagePartial = Pick<
  DbPostImage,
  "id" | "public_url" | "sort_order" | "width" | "height"
>;

type DbPostRow = DbPost & { post_images?: DbPostImagePartial[] };

function resolvePostImages(row: DbPostRow, images?: PostImage[]): PostImage[] {
  if (images) {
    return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return (row.post_images ?? [])
    .map((image) => ({
      id: image.id,
      url: image.public_url,
      sortOrder: image.sort_order,
      width: image.width,
      height: image.height,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function mapPost(row: DbPostRow, images?: PostImage[]): Post {
  const resolvedImages = resolvePostImages(row, images);
  const coverUrl = row.image_url ?? resolvedImages[0]?.url ?? null;
  const coverHeight = row.image_height ?? resolvedImages[0]?.height ?? null;

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    location: row.location,
    distance: row.distance as PostDistance,
    likes: row.likes,
    category: row.category as PostCategory,
    imageUrl: coverUrl,
    imageHeight: coverHeight,
    nearby: row.nearby,
    following: row.following,
    createdAt: row.created_at,
    images: resolvedImages.length > 0 ? resolvedImages : undefined,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
  };
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

function mapComment(row: DbComment): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
    parentId: row.parent_id || null,
    replyToAuthor: row.reply_to_author,
    imageUrl: row.image_url,
  };
}

export async function fetchPosts(): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, post_images(id, public_url, sort_order, width, height)")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapPost(row));
}

export async function fetchPostById(postId: number): Promise<Post | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
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
  return mapPost(data, images);
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
    .select("*")
    .eq("post_id", postId)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapComment);
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
