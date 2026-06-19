"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { applyRuleListSort } from "@/lib/admin/rules/apply-rule-list-sort";
import {
  validateCategory,
  validateEnabled,
  validateMatchType,
  validatePattern,
  validateReasonMessage,
  validateRegexPattern,
} from "@/lib/admin/rules/validate-rule-input";
import { clearModerationRulesCache } from "@/lib/moderation/load-rules";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AdminBlockRuleItem,
  BlockRuleFormInput,
  RuleEnabledFilter,
  RuleSortBy,
} from "@/lib/types/admin-rules";
import {
  DEFAULT_BLOCK_REASON_CODE,
  DEFAULT_BLOCK_SEVERITY,
  DEFAULT_RULE_PRIORITY,
  DEFAULT_RULE_SCOPE,
} from "@/lib/types/admin-rules";

type BlockRuleRow = Database["public"]["Tables"]["content_block_rules"]["Row"];

function mapBlockRule(row: BlockRuleRow): AdminBlockRuleItem {
  return {
    id: row.id,
    pattern: row.pattern,
    category: row.category,
    matchType: row.match_type,
    reasonMessage: row.reason_message,
    enabled: row.enabled,
    priority: row.priority,
    hitCount: Number(row.hit_count ?? 0),
    lastHitAt: row.last_hit_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildBlockRulePayload(input: BlockRuleFormInput) {
  const pattern = validatePattern(input.pattern);
  const category = validateCategory(input.category);
  const matchType = validateMatchType(input.matchType);
  validateRegexPattern(pattern, matchType);

  return {
    pattern,
    category,
    match_type: matchType,
    reason_message: validateReasonMessage(input.reasonMessage),
    enabled: validateEnabled(input.enabled),
    scope: [...DEFAULT_RULE_SCOPE],
    priority: DEFAULT_RULE_PRIORITY,
    reason_code: DEFAULT_BLOCK_REASON_CODE,
    severity: DEFAULT_BLOCK_SEVERITY,
  };
}

export async function listBlockRulesAction(input?: {
  enabled?: RuleEnabledFilter;
  search?: string;
  sortBy?: RuleSortBy;
}): Promise<AdminBlockRuleItem[]> {
  await assertAdminPermission("rules.read");
  if (input?.sortBy === "hit_count") {
    await assertAdminPermission("rules.stats");
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("content_block_rules").select("*").limit(200);

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

  return (data ?? []).map(mapBlockRule);
}

export async function createBlockRuleAction(input: BlockRuleFormInput) {
  await assertAdminPermission("rules.create");

  const supabase = getSupabaseAdminClient();
  const payload = buildBlockRulePayload(input);
  const { error } = await supabase.from("content_block_rules").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function updateBlockRuleAction(input: BlockRuleFormInput & { id: string }) {
  await assertAdminPermission("rules.update");

  if (!input.id) {
    throw new Error("规则 ID 无效");
  }

  const supabase = getSupabaseAdminClient();
  const payload = buildBlockRulePayload(input);
  const { error } = await supabase
    .from("content_block_rules")
    .update(payload)
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function setBlockRuleEnabledAction(input: {
  id: string;
  enabled: boolean;
}) {
  await assertAdminPermission("rules.update");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_block_rules")
    .update({ enabled: validateEnabled(input.enabled) })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}

export async function deleteBlockRuleAction(input: { id: string }) {
  await assertAdminPermission("rules.delete");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("content_block_rules")
    .delete()
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  clearModerationRulesCache();
}
