import type { ModerationDecision } from "@/lib/moderation/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type RuleHitTable =
  | "content_block_rules"
  | "content_risk_rules"
  | "content_whitelist_rules";

async function bumpRuleHits(table: RuleHitTable, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  await Promise.all(
    uniqueIds.map(async (id) => {
      const { data, error: readError } = await supabase
        .from(table)
        .select("hit_count")
        .eq("id", id)
        .maybeSingle();

      if (readError || !data) {
        return;
      }

      const { error: writeError } = await supabase
        .from(table)
        .update({
          hit_count: Number(data.hit_count) + 1,
          last_hit_at: now,
        })
        .eq("id", id);

      if (writeError) {
        throw new Error(`Failed to record rule hit (${table}/${id}): ${writeError.message}`);
      }
    }),
  );
}

export async function recordRuleHits(decision: ModerationDecision) {
  await bumpRuleHits(
    "content_block_rules",
    decision.matchedBlockRules.map((rule) => rule.id),
  );
  await bumpRuleHits(
    "content_risk_rules",
    decision.matchedRiskRules.map((rule) => rule.id),
  );
  await bumpRuleHits(
    "content_whitelist_rules",
    decision.matchedWhitelistRules.map((rule) => rule.id),
  );
}
