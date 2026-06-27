"use server";

import { notifyPostLike } from "@/lib/notifications/create-notification";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

export interface TogglePostLikeResult {
  liked: boolean;
  likes: number;
}

export interface TogglePostFavoriteResult {
  favorited: boolean;
}

export async function togglePostLikeAction(
  postId: number,
): Promise<TogglePostLikeResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("post_likes").insert({
      user_id: user.id,
      post_id: postId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data: post, error: postMetaError } = await supabase
      .from("posts")
      .select("author_id, title")
      .eq("id", postId)
      .eq("moderation_status", "published")
      .maybeSingle();

    if (postMetaError) {
      throw new Error(postMetaError.message);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    if (post) {
      await notifyPostLike({
        postAuthorId: post.author_id,
        actorId: user.id,
        actorName: profile?.nickname?.trim() || "用户",
        postId,
        postTitle: post.title,
      });
    }
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .eq("moderation_status", "published")
    .maybeSingle();

  if (postError) {
    throw new Error(postError.message);
  }

  if (!post) {
    throw new Error("帖子不存在或不可点赞");
  }

  return {
    liked: !existing,
    likes: post.likes,
  };
}

export async function togglePostFavoriteAction(
  postId: number,
): Promise<TogglePostFavoriteResult> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("post_favorites")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (existing) {
    const { error } = await supabase
      .from("post_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("post_favorites").insert({
      user_id: user.id,
      post_id: postId,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    favorited: !existing,
  };
}
