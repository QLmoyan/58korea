import type { RuleMatchType } from "@/lib/types/admin-rules";

const MAX_PATTERN_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 500;

export function normalizeRuleText(value: string): string {
  return value.trim();
}

export function validatePattern(pattern: string): string {
  const normalized = normalizeRuleText(pattern);

  if (!normalized) {
    throw new Error("关键词不能为空");
  }

  if (normalized.length > MAX_PATTERN_LENGTH) {
    throw new Error(`关键词长度不能超过 ${MAX_PATTERN_LENGTH} 个字符`);
  }

  return normalized;
}

export function validateCategory(category: string): string {
  const normalized = normalizeRuleText(category);

  if (!normalized) {
    throw new Error("分类不能为空");
  }

  if (normalized.length > MAX_CATEGORY_LENGTH) {
    throw new Error(`分类长度不能超过 ${MAX_CATEGORY_LENGTH} 个字符`);
  }

  return normalized;
}

export function validateMatchType(matchType: RuleMatchType): RuleMatchType {
  if (!["keyword", "contains", "regex"].includes(matchType)) {
    throw new Error("匹配方式无效");
  }

  return matchType;
}

export function validateRegexPattern(pattern: string, matchType: RuleMatchType) {
  if (matchType !== "regex") {
    return;
  }

  try {
    // eslint-disable-next-line no-new
    new RegExp(pattern, "i");
  } catch {
    throw new Error("正则表达式无效，请检查格式");
  }
}

export function validateReasonMessage(reasonMessage: string): string {
  const normalized = normalizeRuleText(reasonMessage);

  if (!normalized) {
    throw new Error("拦截提示不能为空");
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`拦截提示长度不能超过 ${MAX_MESSAGE_LENGTH} 个字符`);
  }

  return normalized;
}

export function validateOptionalNote(note: string): string | null {
  const normalized = normalizeRuleText(note);
  return normalized || null;
}

export function validateRiskScore(riskScore: number): number {
  if (!Number.isFinite(riskScore) || !Number.isInteger(riskScore)) {
    throw new Error("风险分值必须是整数");
  }

  if (riskScore <= 0) {
    throw new Error("风险分值必须大于 0");
  }

  return riskScore;
}

export function validateScoreReduction(scoreReduction: number): number {
  if (!Number.isFinite(scoreReduction) || !Number.isInteger(scoreReduction)) {
    throw new Error("降分值必须是整数");
  }

  if (scoreReduction < 0) {
    throw new Error("降分值不能小于 0");
  }

  return scoreReduction;
}

export function validateEnabled(enabled: boolean): boolean {
  return Boolean(enabled);
}
