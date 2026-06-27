"use server";

import type { Post, PostCategory, PostDistance, PostImage, PostLinkedCouponSummary } from "@/lib/data/posts";
import type { Comment, CommentImage } from "@/lib/types/community";
import {
  extractStoragePathFromPublicUrl,
  isValidCommentImageStoragePath,
  MAX_COMMENT_IMAGES,
} from "@/lib/comments/comment-images";
import { mapCommentRow } from "@/lib/supabase/comment-mapper";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";
import { prepareLinkedCouponForPublish } from "@/lib/merchant/linked-coupon";
import {
  notifyCommentReply,
  notifyPostComment,
} from "@/lib/notifications/create-notification";
import { loadModerationRules } from "@/lib/moderation/load-rules";
import { recordRuleHits } from "@/lib/moderation/record-rule-hits";
import { scoreContent } from "@/lib/moderation/score-content";
import type { ModerationDecision } from "@/lib/moderation/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerAuthUserSafe } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/user";
import type { PostCouponBindingInput } from "@/lib/types/community";
import {
  resolvePostCategoryForPublish,
  type PublishCategorySelection,
} from "@/lib/posts/resolve-post-category";

const COMMUNITY_MEDIA_BUCKET = "community-media";
const POST_IMAGE_ATTACH_WINDOW_MS = 15 * 60 * 1000;
const COMMENT_IMAGE_ATTACH_WINDOW_MS = 15 * 60 * 1000;
const MAX_POST_IMAGES = 9;

type DbPost = Database["public"]["Tables"]["posts"]["Row"];
type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type Json = Database["public"]["Tables"]["content_reviews"]["Insert"]["matched_block_rules"];

export interface PublishPostInput {
  title: string;
  content: string;
  categorySelection: PublishCategorySelection;
  author: string;
  location: string;
  distance: PostDistance;
  nearby: boolean;
  following: boolean;
  couponBinding?: PostCouponBindingInput;
}

export interface PublishCommentInput {
  id: string;
  postId: number;
  author: string;
  content: string;
  parentId?: string | null;
  replyToAuthor?: string | null;
  imageUrl?: string | null;
  imageStoragePath?: string | null;
}

export interface PublishPostResult {
  post: Post;
  visible: boolean;
  notice?: string;
}

export interface PublishCommentResult {
  comment: Comment;
  visible: boolean;
  notice?: string;
}

export interface AttachPostImageInput {
  storagePath: string;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
}

export interface AttachPostImagesInput {
  postId: number;
  author: string;
  images: AttachPostImageInput[];
}

export interface AttachPostImagesResult {
  images: PostImage[];
}

export interface AttachCommentImageInput {
  imageUrl: string;
  sortOrder: number;
}

export interface AttachCommentImagesInput {
  commentId: string;
  images: AttachCommentImageInput[];
}

export interface AttachCommentImagesResult {
  images: CommentImage[];
}

function mapPost(row: DbPost): Post {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    author: row.author,
    authorId: row.author_id,
    location: row.location,
    distance: row.distance as PostDistance,
    likes: row.likes,
    category: row.category as PostCategory,
    imageUrl: row.image_url,
    imageHeight: row.image_height,
    nearby: row.nearby,
    following: row.following,
    createdAt: row.created_at,
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
    linkedCouponId: row.linked_coupon_id,
  };
}

function mapComment(row: DbComment): Comment {
  return mapCommentRow(row);
}

function mapPostImage(row: Database["public"]["Tables"]["post_images"]["Row"]): PostImage {
  return {
    id: row.id,
    url: row.public_url,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
  };
}

async function fetchServerProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, username, bio, avatar_url, gender, city, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    nickname: data.nickname,
    username: data.username,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    gender: data.gender,
    city: data.city,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function isValidPostImageStoragePath(postId: number, storagePath: string) {
  const prefix = `posts/${postId}/`;
  if (!storagePath.startsWith(prefix)) {
    return false;
  }

  const fileName = storagePath.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/");
}

function getPublicUrlForStoragePath(storagePath: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function createContentReview(
  decision: ModerationDecision,
  targetType: "post" | "comment",
  targetId: string,
  postId: number | null,
  snapshot: Record<string, unknown>,
) {
  if (!decision.shouldCreateReview) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const reviewRiskLevel = decision.riskLevel === "high" ? "high" : "medium";

  const { error } = await supabase.from("content_reviews").insert({
    target_type: targetType,
    target_id: targetId,
    post_id: postId,
    risk_score: decision.riskScore,
    risk_level: reviewRiskLevel,
    status: "open",
    matched_block_rules: decision.matchedBlockRules as unknown as Json,
    matched_risk_rules: decision.matchedRiskRules as unknown as Json,
    matched_whitelist_rules: decision.matchedWhitelistRules as unknown as Json,
    content_snapshot: snapshot as unknown as Json,
  });

  if (error) {
    throw new Error(`Failed to create content review: ${error.message}`);
  }
}

export async function publishPostAction(
  input: PublishPostInput,
): Promise<PublishPostResult> {
  const resolvedCategory = await resolvePostCategoryForPublish({
    categorySelection: input.categorySelection,
    title: input.title,
    content: input.content,
  });

  const rules = await loadModerationRules();
  const decision = scoreContent(
    {
      targetType: "post",
      title: input.title.trim(),
      content: input.content.trim(),
      category: resolvedCategory.category,
    },
    rules,
  );

  await recordRuleHits(decision);

  if (decision.rejected) {
    throw new Error(decision.reasonMessage ?? "内容不符合社区规范，无法发布");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const isPublished = decision.moderationStatus === "published";
  const user = await getServerAuthUserSafe();
  const linkedCouponId = await prepareLinkedCouponForPublish(
    user?.id,
    input.couponBinding,
  );

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title.trim(),
      content: input.content.trim(),
      author: input.author,
      author_id: user?.id ?? null,
      linked_coupon_id: linkedCouponId,
      location: input.location,
      distance: input.distance,
      likes: 0,
      category: resolvedCategory.category,
      category_source: resolvedCategory.categorySource,
      ai_category_confidence: resolvedCategory.aiCategoryConfidence,
      ai_category_reason: resolvedCategory.aiCategoryReason,
      image_url: null,
      image_height: 180,
      nearby: input.nearby,
      following: input.following,
      moderation_status: decision.moderationStatus,
      risk_score: decision.riskScore,
      risk_level: decision.riskLevel,
      published_at: isPublished ? now : null,
      moderation_note: decision.userMessage ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "发布失败，请稍后重试");
  }

  await createContentReview(decision, "post", String(data.id), data.id, {
    title: data.title,
    content: data.content,
    category: data.category,
    author: data.author,
  });

  return {
    post: mapPost(data),
    visible: decision.visible,
    notice: decision.userMessage,
  };
}

export async function attachPostImagesAction(
  input: AttachPostImagesInput,
): Promise<AttachPostImagesResult> {
  const author = input.author.trim();
  const images = input.images ?? [];

  if (!Number.isFinite(input.postId) || input.postId <= 0) {
    throw new Error("无效的帖子 ID");
  }

  if (!author) {
    throw new Error("缺少作者信息，无法关联图片");
  }

  if (images.length === 0) {
    throw new Error("没有可关联的图片");
  }

  if (images.length > MAX_POST_IMAGES) {
    throw new Error(`最多上传 ${MAX_POST_IMAGES} 张图片`);
  }

  for (const image of images) {
    if (!isValidPostImageStoragePath(input.postId, image.storagePath)) {
      throw new Error("图片路径无效");
    }
  }

  const supabase = getSupabaseAdminClient();
  const user = await getServerAuthUserSafe();
  const profile = user ? await fetchServerProfile(user.id) : null;
  const resolvedAuthor = resolveAuthorNameFromAuth(user, profile);

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author, created_at")
    .eq("id", input.postId)
    .maybeSingle();

  if (postError || !post) {
    throw new Error("帖子不存在或无法关联图片");
  }

  if (post.author !== author) {
    throw new Error("无权为该帖子关联图片");
  }

  if (user && post.author !== resolvedAuthor) {
    throw new Error("无权为该帖子关联图片");
  }

  const createdAtMs = new Date(post.created_at).getTime();
  if (
    !Number.isFinite(createdAtMs) ||
    Date.now() - createdAtMs > POST_IMAGE_ATTACH_WINDOW_MS
  ) {
    throw new Error("已超过图片关联时限，请重新发布");
  }

  const { count: existingCount, error: countError } = await supabase
    .from("post_images")
    .select("id", { count: "exact", head: true })
    .eq("post_id", input.postId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((existingCount ?? 0) > 0) {
    throw new Error("该帖子已有关联图片");
  }

  const rows = images.map((image) => ({
    post_id: input.postId,
    storage_path: image.storagePath,
    public_url: getPublicUrlForStoragePath(image.storagePath),
    sort_order: image.sortOrder,
    width: image.width ?? null,
    height: image.height ?? null,
  }));

  const { data, error } = await supabase
    .from("post_images")
    .insert(rows)
    .select("*");

  if (error || !data) {
    throw new Error(error?.message ?? "图片关联失败，请稍后重试");
  }

  return {
    images: data.map(mapPostImage).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function attachCommentImagesAction(
  input: AttachCommentImagesInput,
): Promise<AttachCommentImagesResult> {
  const images = input.images ?? [];
  const commentId = input.commentId.trim();

  if (!commentId) {
    throw new Error("无效的评论 ID");
  }

  if (images.length === 0) {
    throw new Error("没有可关联的图片");
  }

  if (images.length > MAX_COMMENT_IMAGES) {
    throw new Error(`最多上传 ${MAX_COMMENT_IMAGES} 张图片`);
  }

  const user = await getServerAuthUserSafe();
  if (!user?.id) {
    throw new Error("请先登录后再上传评论图片");
  }

  const supabase = getSupabaseAdminClient();
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("id, user_id, created_at")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError || !comment) {
    throw new Error("评论不存在或无法关联图片");
  }

  if (comment.user_id !== user.id) {
    throw new Error("无权为该评论关联图片");
  }

  const createdAtMs = new Date(comment.created_at).getTime();
  if (
    !Number.isFinite(createdAtMs) ||
    Date.now() - createdAtMs > COMMENT_IMAGE_ATTACH_WINDOW_MS
  ) {
    throw new Error("已超过图片关联时限，请重新发送评论");
  }

  const { count: existingCount, error: countError } = await supabase
    .from("comment_images")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((existingCount ?? 0) > 0) {
    throw new Error("该评论已有关联图片");
  }

  for (const image of images) {
    const storagePath = extractStoragePathFromPublicUrl(image.imageUrl);
    if (
      !storagePath ||
      !isValidCommentImageStoragePath(user.id, commentId, storagePath)
    ) {
      throw new Error("评论图片路径无效");
    }
  }

  const rows = images.map((image) => ({
    comment_id: commentId,
    image_url: image.imageUrl,
    sort_order: image.sortOrder,
  }));

  const { data, error } = await supabase
    .from("comment_images")
    .insert(rows)
    .select("*");

  if (error || !data) {
    throw new Error(error?.message ?? "评论图片关联失败，请稍后重试");
  }

  return {
    images: data
      .map((row) => ({
        id: row.id,
        url: row.image_url,
        sortOrder: row.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

async function removeCommentImagesFromStorage(imageUrls: string[]) {
  const storagePaths = imageUrls
    .map((url) => extractStoragePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCommentAction(commentId: string): Promise<void> {
  const trimmedId = commentId.trim();
  if (!trimmedId) {
    throw new Error("无效的评论 ID");
  }

  const user = await getServerAuthUserSafe();
  if (!user?.id) {
    throw new Error("请先登录后再删除评论");
  }

  const supabase = getSupabaseAdminClient();
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("id, user_id, image_storage_path")
    .eq("id", trimmedId)
    .maybeSingle();

  if (commentError || !comment) {
    throw new Error("评论不存在或无法删除");
  }

  if (comment.user_id !== user.id) {
    throw new Error("无权删除该评论");
  }

  const { data: commentImages, error: imagesError } = await supabase
    .from("comment_images")
    .select("image_url")
    .eq("comment_id", trimmedId);

  if (imagesError) {
    throw new Error(imagesError.message);
  }

  const storageUrls = [
    ...(commentImages ?? []).map((row) => row.image_url),
    ...(comment.image_storage_path
      ? [getPublicUrlForStoragePath(comment.image_storage_path)]
      : []),
  ];

  await removeCommentImagesFromStorage(storageUrls);

  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", trimmedId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export async function publishCommentAction(
  input: PublishCommentInput,
): Promise<PublishCommentResult> {
  const rules = await loadModerationRules();
  const decision = scoreContent(
    {
      targetType: "comment",
      content: input.content.trim(),
      replyToAuthor: input.replyToAuthor,
    },
    rules,
  );

  await recordRuleHits(decision);

  if (decision.rejected) {
    throw new Error(decision.reasonMessage ?? "内容不符合社区规范，无法发布");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const isPublished = decision.moderationStatus === "published";
  const user = await getServerAuthUserSafe();

  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: input.id,
      post_id: input.postId,
      author: input.author,
      content: input.content.trim(),
      parent_id: input.parentId ?? null,
      reply_to_author: input.replyToAuthor ?? null,
      user_id: user?.id ?? null,
      image_url: input.imageUrl ?? null,
      image_storage_path: input.imageStoragePath ?? null,
      moderation_status: decision.moderationStatus,
      risk_score: decision.riskScore,
      risk_level: decision.riskLevel,
      published_at: isPublished ? now : null,
      moderation_note: decision.userMessage ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "留言发送失败，请稍后重试");
  }

  await createContentReview(decision, "comment", data.id, data.post_id, {
    content: data.content,
    author: data.author,
    parent_id: data.parent_id,
    reply_to_author: data.reply_to_author,
  });

  if (isPublished && user?.id) {
    const { data: post } = await supabase
      .from("posts")
      .select("author_id, title")
      .eq("id", input.postId)
      .maybeSingle();

    if (input.parentId) {
      const { data: parentComment } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", input.parentId)
        .maybeSingle();

      await notifyCommentReply({
        parentAuthorId: parentComment?.user_id,
        actorId: user.id,
        actorName: input.author,
        postId: input.postId,
        commentId: data.id,
        commentContent: data.content,
        replyToAuthor: input.replyToAuthor ?? null,
      });
    } else {
      await notifyPostComment({
        postAuthorId: post?.author_id,
        actorId: user.id,
        actorName: input.author,
        postId: input.postId,
        postTitle: post?.title ?? "",
        commentId: data.id,
        commentContent: data.content,
      });
    }
  }

  return {
    comment: mapComment(data),
    visible: decision.visible,
    notice: decision.userMessage,
  };
}
