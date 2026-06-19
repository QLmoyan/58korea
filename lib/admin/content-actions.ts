import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type TargetType = "post" | "comment";

export async function fetchTargetRow(targetType: TargetType, targetId: string) {
  const supabase = getSupabaseAdminClient();

  if (targetType === "post") {
    const postId = Number(targetId);
    if (!Number.isFinite(postId)) {
      return null;
    }

    const { data, error } = await supabase
      .from("posts")
      .select("id, moderation_status, published_at")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, moderation_status, published_at")
    .eq("id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function approveTargetContent(
  targetType: TargetType,
  targetId: string,
) {
  const target = await fetchTargetRow(targetType, targetId);
  if (!target) {
    return;
  }

  if (target.moderation_status === "published") {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  if (targetType === "post") {
    const { error } = await supabase
      .from("posts")
      .update({
        moderation_status: "published",
        published_at: now,
      })
      .eq("id", Number(targetId));

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("comments")
    .update({
      moderation_status: "published",
      published_at: now,
    })
    .eq("id", targetId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function hideTargetContent(targetType: TargetType, targetId: string) {
  const target = await fetchTargetRow(targetType, targetId);
  if (!target) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (targetType === "post") {
    const { error } = await supabase
      .from("posts")
      .update({
        moderation_status: "hidden",
        published_at: null,
      })
      .eq("id", Number(targetId));

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("comments")
    .update({
      moderation_status: "hidden",
      published_at: null,
    })
    .eq("id", targetId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTargetContent(
  targetType: TargetType,
  targetId: string,
) {
  const supabase = getSupabaseAdminClient();

  if (targetType === "post") {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", Number(targetId));

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase.from("comments").delete().eq("id", targetId);

  if (error) {
    throw new Error(error.message);
  }
}

export type AdminDecision = "approve" | "dismiss" | "hide" | "delete";

export async function markReviewDecision(
  reviewId: string,
  status: Database["public"]["Tables"]["content_reviews"]["Row"]["status"],
  decision: AdminDecision,
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_reviews")
    .update({
      status,
      decision,
      decided_by: null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", reviewId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markReportStatus(
  reportId: string,
  status: Database["public"]["Tables"]["content_reports"]["Row"]["status"],
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_reports")
    .update({ status })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }
}
