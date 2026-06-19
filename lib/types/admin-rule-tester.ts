import type { ModerationStatus, RiskLevel } from "@/lib/moderation/constants";
import type { RuleHit } from "@/lib/moderation/types";

export type RuleTesterTargetType = "post" | "comment";

export interface RuleScoreBreakdownItem {
  label: string;
  delta: number;
  kind: "risk" | "whitelist";
}

export interface AdminRuleTestResult {
  rejected: boolean;
  rejectMessage: string | null;
  riskScore: number;
  rawRiskScore: number;
  whitelistReduction: number;
  riskLevel: RiskLevel;
  moderationStatus: ModerationStatus;
  visible: boolean;
  shouldCreateReview: boolean;
  userMessage: string | null;
  matchedBlockRules: RuleHit[];
  matchedRiskRules: RuleHit[];
  matchedWhitelistRules: RuleHit[];
  scoreBreakdown: RuleScoreBreakdownItem[];
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  published: "公开发布",
  pending_review: "待审核",
  hidden: "已隐藏",
  rejected: "拒绝发布",
};
