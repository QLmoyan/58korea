export type ReportReason =
  | "porn"
  | "gambling"
  | "fraud"
  | "illegal"
  | "harassment"
  | "misinformation"
  | "other";

export type ReportTargetType = "post" | "comment";

export interface ReportReasonOption {
  value: ReportReason;
  label: string;
}

export const REPORT_REASONS: ReportReasonOption[] = [
  { value: "porn", label: "色情" },
  { value: "gambling", label: "赌博" },
  { value: "fraud", label: "诈骗" },
  { value: "illegal", label: "违法" },
  { value: "harassment", label: "骚扰" },
  { value: "misinformation", label: "虚假信息" },
  { value: "other", label: "其他" },
];

export const REPORT_SUCCESS_MESSAGE = "感谢举报，我们会尽快处理";
export const REPORT_DUPLICATE_MESSAGE = "您已举报过该内容";

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some((item) => item.value === value);
}
