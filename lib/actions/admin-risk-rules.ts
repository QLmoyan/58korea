"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { applyRuleListSort } from "@/lib/admin/rules/apply-rule-list-sort";
import {
  validateCategory,
  validateEnabled,
  validateMatchType,
  validateOptionalNote,
  validatePattern,
  validateRegexPattern,
  validateRiskScore,
} from "@/lib/admin/rules/validate-rule-input";
import { clearModerationRulesCache } from "@/lib/moderation/load-rules";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminRiskRuleItem,
  RiskRuleFormInput,
  RuleEnabledFilter,
  RuleSortBy,
} from "@/lib/types/admin-rules";
import { DEFAULT_RULE_PRIORITY, DEFAULT_RULE_SCOPE } from "@/lib/types/admin-rules";

type RiskRuleRow = Database["public"]["Tables"]["content_risk_rules"]["Row"];

function mapRiskRule(row: RiskRuleRow): AdminRiskRuleItem {
  return {
    id: row.id,
    pattern: row.pattern,
    category: row.category,
    matchType: row.match_type,
    riskScore: row.risk_score,
    note: row.note,
    enabled: row.enabled,
    priority: row.priority,
    hitCount: Number(row.hit_count ?? 0),
    lastHitAt: row.last_hit_at,
    createdAt: row.created_at,
  };
}

function buildRiskRulePayload(input: RiskRuleFormInput) {
  const pattern = validatePattern(input.pattern);
  const category = validateCategory(input.category);
  const matchType = validateMatchType(input.matchType);
  validateRegexPattern(pattern, matchType);

  return {
    pattern,
    category,
    match_type: matchType,
    risk_score: validateRiskScore(input.riskScore),
    note: validateOptionalNote(input.note),
    enabled: validateEnabled(input.enabled),
    scope: [...DEFAULT_RULE_SCOPE],
    priority: DEFAULT_RULE_PRIORITY,
  };
}

export async function listRiskRulesAction(input?: {
  enabled?: RuleEnabledFilter;
  search?: string;
  sortBy?: RuleSortBy;
}): Promise<AdminRiskRuleItem[]> {
  await assertAdminPermission("rules.read");
  if (input?.sortBy === "hit_count") {
    await assertAdminPermission("rules.stats");
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("content_risk_rules").select("*").limit(200);

  if (input?.enabled === "enabled") {
    query = query.eq("enabled", true);
  } else if (input?.enabled === "disabled") {
    query = query.eq("enabled", false);
  }

  const search = input?.search?.trim();
  if (search) {
    query = query.ilike("pattern", `%${search}%`);
  }

  query = applyRuleListSort(query, input?.sortBy);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRiskRule);
}

export async function createRiskRuleAction(input: RiskRuleFormInput) {
  await assertAdminPermission("rules.create");

  const supabase = getSupabaseAdminClient();
  const payload = buildRiskRulePayload(input);
  const { error } = await supabase.from("content_risk_rules").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function updateRiskRuleAction(input: RiskRuleFormInput & { id: string }) {
  await assertAdminPermission("rules.update");

  if (!input.id) {
    throw new Error("规则 ID 无效");
  }

  const supabase = getSupabaseAdminClient();
  const payload = buildRiskRulePayload(input);
  const { error } = await supabase
    .from("content_risk_rules")
    .update(payload)
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function setRiskRuleEnabledAction(input: {
  id: string;
  enabled: boolean;
}) {
  await assertAdminPermission("rules.update");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_risk_rules")
    .update({ enabled: validateEnabled(input.enabled) })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function deleteRiskRuleAction(input: { id: string }) {
  await assertAdminPermission("rules.delete");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_risk_rules")
    .delete()
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}
