export type ReviewStatus =
  | "open"
  | "approved"
  | "hidden"
  | "deleted"
  | "dismissed";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type AdminReviewAction = "approve" | "dismiss" | "hide" | "delete";
export type AdminReportAction = "resolve" | "dismiss" | "hide" | "delete";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  open: "待处理",
  approved: "已通过",
  hidden: "已隐藏",
  deleted: "已删除",
  dismissed: "已忽略",
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: "待处理",
  reviewing: "处理中",
  resolved: "已处理",
  dismissed: "已忽略",
};

export const RISK_LEVEL_LABELS = {
  medium: "中风险",
  high: "高风险",
} as const;

export function formatJsonPreview(value: unknown): string {
  if (!value) {
    return "—";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
