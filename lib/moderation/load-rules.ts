import type { ModerationRulesBundle } from "@/lib/moderation/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

let cachedRules: ModerationRulesBundle | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function loadModerationRules(): Promise<ModerationRulesBundle> {
  const now = Date.now();
  if (cachedRules && now - cachedAt < CACHE_TTL_MS) {
    return cachedRules;
  }

  const supabase = getSupabaseAdminClient();

  const [blockResult, riskResult, whitelistResult] = await Promise.all([
    supabase
      .from("content_block_rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true }),
    supabase
      .from("content_risk_rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true }),
    supabase
      .from("content_whitelist_rules")
      .select("*")
      .eq("enabled", true)
      .order("priority", { ascending: true }),
  ]);

  if (blockResult.error) {
    throw new Error(`Failed to load block rules: ${blockResult.error.message}`);
  }

  if (riskResult.error) {
    throw new Error(`Failed to load risk rules: ${riskResult.error.message}`);
  }

  if (whitelistResult.error) {
    throw new Error(
      `Failed to load whitelist rules: ${whitelistResult.error.message}`,
    );
  }

  cachedRules = {
    blockRules: blockResult.data ?? [],
    riskRules: riskResult.data ?? [],
    whitelistRules: whitelistResult.data ?? [],
  };
  cachedAt = now;

  return cachedRules;
}

export function clearModerationRulesCache() {
  cachedRules = null;
  cachedAt = 0;
}
