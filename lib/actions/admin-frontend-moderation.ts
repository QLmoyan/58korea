"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import {
  deleteTargetContent,
  hideTargetContent,
} from "@/lib/admin/content-actions";
import {
  applyManualPostRiskLabel,
  clearManualPostRiskLabel,
} from "@/lib/admin/manual-post-risk-actions";

function resolvePostId(postId: number) {
  if (!Number.isFinite(postId) || postId <= 0) {
    throw new Error("帖子 ID 无效");
  }

  return postId;
}

function resolveCommentId(commentId: string) {
  const trimmed = commentId.trim();
  if (!trimmed) {
    throw new Error("评论 ID 无效");
  }

  return trimmed;
}

export async function frontendAddPostRiskLabelAction(input: { postId: number }) {
  await assertAdminPermission("content.post.risk_label");
  await applyManualPostRiskLabel(resolvePostId(input.postId));
}

export async function frontendRemovePostRiskLabelAction(input: { postId: number }) {
  await assertAdminPermission("content.post.risk_label");
  await clearManualPostRiskLabel(resolvePostId(input.postId));
}

export async function frontendHidePostAction(input: { postId: number }) {
  await assertAdminPermission("content.post.hide");
  await hideTargetContent("post", String(resolvePostId(input.postId)));
}

export async function frontendDeletePostAction(input: { postId: number }) {
  await assertAdminPermission("content.post.delete");
  await deleteTargetContent("post", String(resolvePostId(input.postId)));
}

export async function frontendHideCommentAction(input: { commentId: string }) {
  await assertAdminPermission("content.comment.hide");
  await hideTargetContent("comment", resolveCommentId(input.commentId));
}

export async function frontendDeleteCommentAction(input: { commentId: string }) {
  await assertAdminPermission("content.comment.delete");
  await deleteTargetContent("comment", resolveCommentId(input.commentId));
}
