"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import {
  deleteTargetContent,
  hideTargetContent,
  markReportStatus,
} from "@/lib/admin/content-actions";
import { REPORT_REASONS, type ReportReason } from "@/lib/types/report";
import type { AdminReportAction, ReportStatus } from "@/lib/types/admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ReportRow = Database["public"]["Tables"]["content_reports"]["Row"];

export interface AdminReportItem {
  id: string;
  targetType: ReportRow["target_type"];
  targetId: string;
  postId: number | null;
  reason: ReportReason;
  reasonLabel: string;
  detail: string | null;
  status: ReportRow["status"];
  createdAt: string;
  targetPreview: string | null;
}

const reasonLabelMap = Object.fromEntries(
  REPORT_REASONS.map((item) => [item.value, item.label]),
) as Record<ReportReason, string>;

async function loadTargetPreview(
  targetType: ReportRow["target_type"],
  targetId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();

  if (targetType === "post") {
    const { data } = await supabase
      .from("posts")
      .select("title, content, moderation_status")
      .eq("id", Number(targetId))
      .maybeSingle();

    if (!data) {
      return "目标内容不存在";
    }

    return `[${data.moderation_status}] ${data.title}\n${data.content ?? ""}`.trim();
  }

  const { data } = await supabase
    .from("comments")
    .select("content, moderation_status, author")
    .eq("id", targetId)
    .maybeSingle();

  if (!data) {
    return "目标内容不存在";
  }

  return `[${data.moderation_status}] ${data.author}: ${data.content ?? ""}`.trim();
}

function mapReport(row: ReportRow, targetPreview: string | null): AdminReportItem {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    postId: row.post_id,
    reason: row.reason,
    reasonLabel: reasonLabelMap[row.reason] ?? row.reason,
    detail: row.detail,
    status: row.status,
    createdAt: row.created_at,
    targetPreview,
  };
}

export async function listContentReportsAction(input?: {
  status?: ReportStatus | "all";
}): Promise<AdminReportItem[]> {
  await assertAdminPermission("reports.read");

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("content_reports")
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

  const rows = data ?? [];
  const previews = await Promise.all(
    rows.map((row) => loadTargetPreview(row.target_type, row.target_id)),
  );

  return rows.map((row, index) => mapReport(row, previews[index] ?? null));
}

export async function handleReportAction(input: {
  reportId: string;
  action: AdminReportAction;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: report, error } = await supabase
    .from("content_reports")
    .select("*")
    .eq("id", input.reportId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!report) {
    throw new Error("举报记录不存在");
  }

  switch (input.action) {
    case "resolve":
      await assertAdminPermission("reports.write");
      await markReportStatus(report.id, "resolved");
      break;
    case "dismiss":
      await assertAdminPermission("reports.write");
      await markReportStatus(report.id, "dismissed");
      break;
    case "hide":
      await assertAdminPermission(
        report.target_type === "post"
          ? "content.post.hide"
          : "content.comment.hide",
      );
      await hideTargetContent(report.target_type, report.target_id);
      await markReportStatus(report.id, "resolved");
      break;
    case "delete":
      await assertAdminPermission(
        report.target_type === "post"
          ? "content.post.delete"
          : "content.comment.delete",
      );
      await deleteTargetContent(report.target_type, report.target_id);
      await markReportStatus(report.id, "resolved");
      break;
    default:
      throw new Error("不支持的操作");
  }
}
