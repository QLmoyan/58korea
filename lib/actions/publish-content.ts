"use server";

import type { Post, PostDistance, PostCategory } from "@/lib/data/posts";
import type { Comment } from "@/lib/types/community";
import { loadModerationRules } from "@/lib/moderation/load-rules";
import { recordRuleHits } from "@/lib/moderation/record-rule-hits";
import { scoreContent } from "@/lib/moderation/score-content";
import type { ModerationDecision } from "@/lib/moderation/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type DbPost = Database["public"]["Tables"]["posts"]["Row"];
type DbComment = Database["public"]["Tables"]["comments"]["Row"];
type Json = Database["public"]["Tables"]["content_reviews"]["Insert"]["matched_block_rules"];

export interface PublishPostInput {
  title: string;
  content: string;
  category: string;
  author: string;
  location: string;
  distance: PostDistance;
  nearby: boolean;
  following: boolean;
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
    riskLevel: row.risk_level,
    riskScore: row.risk_score,
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
  const rules = await loadModerationRules();
  const decision = scoreContent(
    {
      targetType: "post",
      title: input.title.trim(),
      content: input.content.trim(),
      category: input.category,
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

  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: input.title.trim(),
      content: input.content.trim(),
      author: input.author,
      location: input.location,
      distance: input.distance,
      likes: 0,
      category: input.category,
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

  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: input.id,
      post_id: input.postId,
      author: input.author,
      content: input.content.trim(),
      parent_id: input.parentId ?? null,
      reply_to_author: input.replyToAuthor ?? null,
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

  return {
    comment: mapComment(data),
    visible: decision.visible,
    notice: decision.userMessage,
  };
}
