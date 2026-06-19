import {
  MODERATION_HIGH_AUTHOR_NOTICE,
  MODERATION_HIGH_MIN,
  MODERATION_LOW_MAX,
} from "@/lib/moderation/constants";
import { buildInspectionText } from "@/lib/moderation/normalize-text";
import {
  matchesRulePattern,
  ruleAppliesToTarget,
} from "@/lib/moderation/match-rules";
import type {
  ModerationDecision,
  ModerationInput,
  ModerationRulesBundle,
  RuleHit,
} from "@/lib/moderation/types";

function resolveRiskLevel(score: number) {
  if (score <= MODERATION_LOW_MAX) {
    return "low" as const;
  }

  if (score < MODERATION_HIGH_MIN) {
    return "medium" as const;
  }

  return "high" as const;
}

export function scoreContent(
  input: ModerationInput,
  rules: ModerationRulesBundle,
): ModerationDecision {
  const inspectionText = buildInspectionText({
    targetType: input.targetType,
    title: input.targetType === "post" ? input.title : undefined,
    content: input.content,
    category: input.targetType === "post" ? input.category : undefined,
    replyToAuthor:
      input.targetType === "comment" ? input.replyToAuthor : undefined,
  });

  for (const rule of rules.blockRules) {
    if (!ruleAppliesToTarget(rule.scope, input.targetType)) {
      continue;
    }

    if (matchesRulePattern(inspectionText, rule.pattern, rule.match_type)) {
      return {
        allowed: false,
        rejected: true,
        reasonMessage: rule.reason_message,
        moderationStatus: "rejected",
        riskScore: 0,
        riskLevel: "high",
        visible: false,
        shouldCreateReview: false,
        matchedBlockRules: [
          {
            id: rule.id,
            pattern: rule.pattern,
            category: rule.category,
            reason_code: rule.reason_code,
            reason_message: rule.reason_message,
          },
        ],
        matchedRiskRules: [],
        matchedWhitelistRules: [],
        userMessage: rule.reason_message,
      };
    }
  }

  const matchedRiskRules: RuleHit[] = [];
  let riskScore = 0;

  for (const rule of rules.riskRules) {
    if (!ruleAppliesToTarget(rule.scope, input.targetType)) {
      continue;
    }

    if (matchesRulePattern(inspectionText, rule.pattern, rule.match_type)) {
      riskScore += rule.risk_score;
      matchedRiskRules.push({
        id: rule.id,
        pattern: rule.pattern,
        category: rule.category,
        risk_score: rule.risk_score,
      });
    }
  }

  const matchedWhitelistRules: RuleHit[] = [];
  let whitelistReduction = 0;
  let forceAllow = false;

  for (const rule of rules.whitelistRules) {
    if (!ruleAppliesToTarget(rule.scope, input.targetType)) {
      continue;
    }

    if (matchesRulePattern(inspectionText, rule.pattern, rule.match_type)) {
      whitelistReduction += rule.score_reduction;
      matchedWhitelistRules.push({
        id: rule.id,
        pattern: rule.pattern,
        category: rule.category,
        score_reduction: rule.score_reduction,
      });

      if (rule.force_allow) {
        forceAllow = true;
      }
    }
  }

  riskScore = Math.max(0, riskScore - whitelistReduction);

  if (forceAllow && riskScore <= MODERATION_LOW_MAX) {
    return {
      allowed: true,
      rejected: false,
      moderationStatus: "published",
      riskScore,
      riskLevel: "low",
      visible: true,
      shouldCreateReview: false,
      matchedBlockRules: [],
      matchedRiskRules,
      matchedWhitelistRules,
    };
  }

  const riskLevel = resolveRiskLevel(riskScore);

  if (riskLevel === "low") {
    return {
      allowed: true,
      rejected: false,
      moderationStatus: "published",
      riskScore,
      riskLevel,
      visible: true,
      shouldCreateReview: false,
      matchedBlockRules: [],
      matchedRiskRules,
      matchedWhitelistRules,
    };
  }

  if (riskLevel === "medium") {
    return {
      allowed: true,
      rejected: false,
      moderationStatus: "published",
      riskScore,
      riskLevel,
      visible: true,
      shouldCreateReview: true,
      matchedBlockRules: [],
      matchedRiskRules,
      matchedWhitelistRules,
    };
  }

  return {
    allowed: true,
    rejected: false,
    moderationStatus: "pending_review",
    riskScore,
    riskLevel,
    visible: false,
    shouldCreateReview: true,
    matchedBlockRules: [],
    matchedRiskRules,
    matchedWhitelistRules,
    userMessage: MODERATION_HIGH_AUTHOR_NOTICE,
  };
}
