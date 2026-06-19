import { normalizeModerationText } from "@/lib/moderation/normalize-text";

export function matchesRulePattern(
  inspectionText: string,
  pattern: string,
  matchType: "keyword" | "contains" | "regex",
): boolean {
  const normalizedPattern = normalizeModerationText(pattern);

  if (!normalizedPattern) {
    return false;
  }

  if (matchType === "regex") {
    try {
      return new RegExp(pattern, "i").test(inspectionText);
    } catch {
      return false;
    }
  }

  if (matchType === "contains" || matchType === "keyword") {
    return inspectionText.includes(normalizedPattern);
  }

  return false;
}

export function ruleAppliesToTarget(
  scope: string[],
  targetType: "post" | "comment",
): boolean {
  return scope.includes(targetType);
}
