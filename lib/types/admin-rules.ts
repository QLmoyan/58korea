export type RuleMatchType = "keyword" | "contains" | "regex";

export type RuleEnabledFilter = "all" | "enabled" | "disabled";

export type RuleSortBy = "priority" | "hit_count";

export const RULE_MATCH_TYPE_LABELS: Record<RuleMatchType, string> = {
  keyword: "关键词",
  contains: "包含",
  regex: "正则",
};

export const RULE_MATCH_TYPE_OPTIONS: Array<{
  value: RuleMatchType;
  label: string;
}> = [
  { value: "keyword", label: "关键词" },
  { value: "contains", label: "包含" },
  { value: "regex", label: "正则" },
];

export const RULE_SORT_OPTIONS: Array<{ value: RuleSortBy; label: string }> = [
  { value: "priority", label: "默认排序" },
  { value: "hit_count", label: "命中次数" },
];

export function formatRuleHitTime(value: string | null | undefined): string {
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

export const RULE_ENABLED_FILTER_OPTIONS: Array<{
  value: RuleEnabledFilter;
  label: string;
}> = [
  { value: "all", label: "全部" },
  { value: "enabled", label: "已启用" },
  { value: "disabled", label: "已停用" },
];

export const DEFAULT_RULE_SCOPE = ["post", "comment"] as const;
export const DEFAULT_RULE_PRIORITY = 10;
export const DEFAULT_BLOCK_REASON_CODE = "BLOCKED";
export const DEFAULT_BLOCK_SEVERITY = "block";
export const DEFAULT_WHITELIST_FORCE_ALLOW = false;

export interface BlockRuleFormInput {
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  reasonMessage: string;
  enabled: boolean;
}

export interface RiskRuleFormInput {
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  riskScore: number;
  note: string;
  enabled: boolean;
}

export interface WhitelistRuleFormInput {
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  scoreReduction: number;
  note: string;
  enabled: boolean;
}

export interface AdminBlockRuleItem {
  id: string;
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  reasonMessage: string;
  enabled: boolean;
  priority: number;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRiskRuleItem {
  id: string;
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  riskScore: number;
  note: string | null;
  enabled: boolean;
  priority: number;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
}

export interface AdminWhitelistRuleItem {
  id: string;
  pattern: string;
  category: string;
  matchType: RuleMatchType;
  scoreReduction: number;
  note: string | null;
  enabled: boolean;
  priority: number;
  hitCount: number;
  lastHitAt: string | null;
  createdAt: string;
}
