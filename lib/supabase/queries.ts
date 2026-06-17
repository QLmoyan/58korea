import type { Post, PostCategory, PostDistance } from "@/lib/data/posts";
import type { Comment } from "@/lib/types/community";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type DbPost = Database["public"]["Tables"]["posts"]["Row"];
type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type DbPostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type DbCommentInsert = Database["public"]["Tables"]["comments"]["Insert"];

function mapPost(row: DbPost): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    location: row.location,
    distance: row.distance as PostDistance,
    likes: row.likes,
    category: row.category as PostCategory,
    imageUrl: row.image_url,
    imageHeight: row.image_height,
    nearby: row.nearby,
    following: row.following,
    createdAt: row.created_at,
  };
}

function mapComment(row: DbComment): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.author,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function fetchPosts(): Promise<Post[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapPost);
}

export async function fetchCommentsByPostId(postId: number): Promise<Comment[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
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
