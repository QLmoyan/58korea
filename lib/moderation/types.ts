import type { ContentTargetType, ModerationStatus, RiskLevel } from "@/lib/moderation/constants";

export interface ModerationRuleBase {
  id: string;
  pattern: string;
  match_type: "keyword" | "contains" | "regex";
  scope: string[];
  category: string;
  enabled: boolean;
  priority: number;
}

export interface BlockRule extends ModerationRuleBase {
  reason_code: string;
  reason_message: string;
}

export interface RiskRule extends ModerationRuleBase {
  risk_score: number;
  note: string | null;
}

export interface WhitelistRule extends ModerationRuleBase {
  score_reduction: number;
  force_allow: boolean;
  note: string | null;
}

export interface ModerationRulesBundle {
  blockRules: BlockRule[];
  riskRules: RiskRule[];
  whitelistRules: WhitelistRule[];
}

export interface RuleHit {
  id: string;
  pattern: string;
  category: string;
  reason_code?: string;
  reason_message?: string;
  risk_score?: number;
  score_reduction?: number;
}

export interface PostModerationInput {
  targetType: "post";
  title: string;
  content: string;
  category: string;
}

export interface CommentModerationInput {
  targetType: "comment";
  content: string;
  replyToAuthor?: string | null;
}

export type ModerationInput = PostModerationInput | CommentModerationInput;

export interface ModerationDecision {
  allowed: boolean;
  rejected: boolean;
  reasonMessage?: string;
  moderationStatus: ModerationStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  visible: boolean;
  shouldCreateReview: boolean;
  matchedBlockRules: RuleHit[];
  matchedRiskRules: RuleHit[];
  matchedWhitelistRules: RuleHit[];
  userMessage?: string;
}
