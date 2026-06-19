import {
  MANUAL_POST_RISK_MIN_SCORE,
  MANUAL_POST_RISK_NOTE,
} from "@/lib/admin/manual-post-risk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function resolvePostId(postId: number): number {
  if (!Number.isFinite(postId) || postId <= 0) {
    throw new Error("帖子 ID 无效");
  }

  return postId;
}

async function fetchPost(postId: number) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, moderation_status, published_at, risk_score, risk_level, moderation_note")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("帖子不存在");
  }

  return data;
}

export async function applyManualPostRiskLabel(postIdInput: number) {
  const postId = resolvePostId(postIdInput);
  const post = await fetchPost(postId);
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("posts")
    .update({
      moderation_status: "published",
      published_at: post.published_at ?? now,
      risk_level: "medium",
      risk_score: Math.max(post.risk_score ?? 0, MANUAL_POST_RISK_MIN_SCORE),
      moderation_note: MANUAL_POST_RISK_NOTE,
    })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearManualPostRiskLabel(postIdInput: number) {
  const postId = resolvePostId(postIdInput);
  await fetchPost(postId);

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("posts")
    .update({
      risk_level: "low",
      risk_score: 0,
      moderation_note: null,
    })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }
}
