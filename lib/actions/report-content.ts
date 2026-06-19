"use server";

import {
  REPORT_DUPLICATE_MESSAGE,
  REPORT_SUCCESS_MESSAGE,
  isReportReason,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/types/report";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_DETAIL_LENGTH = 200;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SubmitReportInput {
  targetType: ReportTargetType;
  targetId: string;
  postId: number;
  reason: ReportReason;
  detail?: string;
  reporterKey: string;
}

export interface SubmitReportResult {
  message: string;
}

function normalizeDetail(detail?: string): string | null {
  const trimmed = detail?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_DETAIL_LENGTH);
}

async function assertPublishedTarget(
  targetType: ReportTargetType,
  targetId: string,
  postId: number,
) {
  const supabase = getSupabaseAdminClient();

  if (targetType === "post") {
    if (String(postId) !== targetId) {
      throw new Error("内容不存在或已删除");
    }

    const { data, error } = await supabase
      .from("posts")
      .select("id, moderation_status")
      .eq("id", postId)
      .eq("moderation_status", "published")
      .maybeSingle();

    if (error || !data) {
      throw new Error("内容不存在或已删除");
    }

    return;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, moderation_status")
    .eq("id", targetId)
    .eq("post_id", postId)
    .eq("moderation_status", "published")
    .maybeSingle();

  if (error || !data) {
    throw new Error("内容不存在或已删除");
  }
}

async function assertNotDuplicateReport(
  targetType: ReportTargetType,
  targetId: string,
  reporterKey: string,
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("content_reports")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("reporter_key", reporterKey)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    throw new Error("举报提交失败，请稍后重试");
  }

  if (data) {
    throw new Error(REPORT_DUPLICATE_MESSAGE);
  }
}

export async function submitReportAction(
  input: SubmitReportInput,
): Promise<SubmitReportResult> {
  if (!input.targetType || !input.targetId || !Number.isFinite(input.postId)) {
    throw new Error("举报提交失败，请稍后重试");
  }

  if (!isReportReason(input.reason)) {
    throw new Error("请选择举报原因");
  }

  const reporterKey = input.reporterKey.trim();
  if (!UUID_PATTERN.test(reporterKey)) {
    throw new Error("举报提交失败，请稍后重试");
  }

  if (input.reason === "other" && !input.detail?.trim()) {
    throw new Error("请补充说明举报原因");
  }

  await assertPublishedTarget(input.targetType, input.targetId, input.postId);
  await assertNotDuplicateReport(
    input.targetType,
    input.targetId,
    reporterKey,
  );

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("content_reports").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    post_id: input.postId,
    reason: input.reason,
    detail: normalizeDetail(input.detail),
    reporter_key: reporterKey,
    reporter_user_id: null,
    status: "open",
    linked_review_id: null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(REPORT_DUPLICATE_MESSAGE);
    }

    throw new Error(error.message || "举报提交失败，请稍后重试");
  }

  return { message: REPORT_SUCCESS_MESSAGE };
}
