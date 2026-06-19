"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { loadModerationRules } from "@/lib/moderation/load-rules";
import { scoreContent } from "@/lib/moderation/score-content";
import type { ModerationInput } from "@/lib/moderation/types";
import type {
  AdminRuleTestResult,
  RuleScoreBreakdownItem,
  RuleTesterTargetType,
} from "@/lib/types/admin-rule-tester";

function buildScoreBreakdown(
  matchedRiskRules: AdminRuleTestResult["matchedRiskRules"],
  matchedWhitelistRules: AdminRuleTestResult["matchedWhitelistRules"],
): RuleScoreBreakdownItem[] {
  const items: RuleScoreBreakdownItem[] = [];

  for (const rule of matchedRiskRules) {
    items.push({
      label: rule.pattern,
      delta: rule.risk_score ?? 0,
      kind: "risk",
    });
  }

  for (const rule of matchedWhitelistRules) {
    items.push({
      label: rule.pattern,
      delta: -(rule.score_reduction ?? 0),
      kind: "whitelist",
    });
  }

  return items;
}

export async function testModerationRulesAction(input: {
  targetType: RuleTesterTargetType;
  title?: string;
  content: string;
  category?: string;
  replyToAuthor?: string;
}): Promise<AdminRuleTestResult> {
  await assertAdminPermission("rules.test");

  const content = input.content.trim();
  if (!content) {
    throw new Error("请输入检测文本");
  }

  const rules = await loadModerationRules();
  let moderationInput: ModerationInput;

  if (input.targetType === "post") {
    moderationInput = {
      targetType: "post",
      title: input.title?.trim() || "规则测试标题",
      content,
      category: input.category?.trim() || "其他",
    };
  } else {
    moderationInput = {
      targetType: "comment",
      content,
      replyToAuthor: input.replyToAuthor?.trim() || null,
    };
  }

  const decision = scoreContent(moderationInput, rules);

  const rawRiskScore = decision.matchedRiskRules.reduce(
    (sum, rule) => sum + (rule.risk_score ?? 0),
    0,
  );
  const whitelistReduction = decision.matchedWhitelistRules.reduce(
    (sum, rule) => sum + (rule.score_reduction ?? 0),
    0,
  );

  return {
    rejected: decision.rejected,
    rejectMessage: decision.reasonMessage ?? null,
    riskScore: decision.riskScore,
    rawRiskScore,
    whitelistReduction,
    riskLevel: decision.riskLevel,
    moderationStatus: decision.moderationStatus,
    visible: decision.visible,
    shouldCreateReview: decision.shouldCreateReview,
    userMessage: decision.userMessage ?? null,
    matchedBlockRules: decision.matchedBlockRules,
    matchedRiskRules: decision.matchedRiskRules,
    matchedWhitelistRules: decision.matchedWhitelistRules,
    scoreBreakdown: buildScoreBreakdown(
      decision.matchedRiskRules,
      decision.matchedWhitelistRules,
    ),
  };
}
