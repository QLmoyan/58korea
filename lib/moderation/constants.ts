export const MODERATION_LOW_MAX = 59;
export const MODERATION_HIGH_MIN = 100;

export const MODERATION_MEDIUM_DISCLAIMER =
  "⚠️ 该内容可能存在违反社区规定的风险，请注意甄别。";

export const MODERATION_HIGH_AUTHOR_NOTICE =
  "内容已提交审核，通过后将公开展示";

export type ModerationStatus =
  | "published"
  | "pending_review"
  | "hidden"
  | "rejected";

export type RiskLevel = "low" | "medium" | "high";

export type ContentTargetType = "post" | "comment";
