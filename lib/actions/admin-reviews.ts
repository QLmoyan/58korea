"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import {
  approveTargetContent,
  deleteTargetContent,
  hideTargetContent,
  markReviewDecision,
} from "@/lib/admin/content-actions";
import type { AdminReviewAction, ReviewStatus } from "@/lib/types/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ReviewRow = Database["public"]["Tables"]["content_reviews"]["Row"];

export interface AdminReviewItem {
  id: string;
  targetType: ReviewRow["target_type"];
  targetId: string;
  postId: number | null;
  riskScore: number;
  riskLevel: ReviewRow["risk_level"];
  status: ReviewRow["status"];
  matchedBlockRules: ReviewRow["matched_block_rules"];
  matchedRiskRules: ReviewRow["matched_risk_rules"];
  matchedWhitelistRules: ReviewRow["matched_whitelist_rules"];
  contentSnapshot: ReviewRow["content_snapshot"];
  createdAt: string;
  decision: string | null;
  decidedAt: string | null;
}

function mapReview(row: ReviewRow): AdminReviewItem {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    postId: row.post_id,
    riskScore: row.risk_score,
    riskLevel: row.risk_level,
    status: row.status,
    matchedBlockRules: row.matched_block_rules,
    matchedRiskRules: row.matched_risk_rules,
    matchedWhitelistRules: row.matched_whitelist_rules,
    contentSnapshot: row.content_snapshot,
    createdAt: row.created_at,
    decision: row.decision,
    decidedAt: row.decided_at,
  };
}

export async function listContentReviewsAction(input?: {
  status?: ReviewStatus | "all";
}): Promise<AdminReviewItem[]> {
  await assertAdminPermission("reviews.read");

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("content_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (input?.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapReview);
}

export async function handleReviewAction(input: {
  reviewId: string;
  action: AdminReviewAction;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: review, error } = await supabase
    .from("content_reviews")
    .select("*")
    .eq("id", input.reviewId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!review) {
    throw new Error("审核记录不存在");
  }

  switch (input.action) {
    case "approve":
      await assertAdminPermission("reviews.write");
      await approveTargetContent(review.target_type, review.target_id);
      await markReviewDecision(review.id, "approved", "approve");
      break;
    case "dismiss":
      await assertAdminPermission("reviews.write");
      await markReviewDecision(review.id, "dismissed", "dismiss");
      break;
    case "hide":
      await assertAdminPermission(
        review.target_type === "post"
          ? "content.post.hide"
          : "content.comment.hide",
      );
      await hideTargetContent(review.target_type, review.target_id);
      await markReviewDecision(review.id, "hidden", "hide");
      break;
    case "delete":
      await assertAdminPermission(
        review.target_type === "post"
          ? "content.post.delete"
          : "content.comment.delete",
      );
      await deleteTargetContent(review.target_type, review.target_id);
      await markReviewDecision(review.id, "deleted", "delete");
      break;
    default:
      throw new Error("不支持的操作");
  }
}
