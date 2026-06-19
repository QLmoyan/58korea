import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { clearModerationRulesCache } from "../lib/moderation/load-rules";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    env[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

const V12_BLOCK_PATTERNS = [
  "六合彩",
  "菠菜",
  "上分",
  "下分",
  "冰毒",
  "洗钱",
  "假证",
  "跑分",
  "刷单返利",
  "找小姐",
  "包夜",
  "特殊服务",
  "外围",
  "楼凤",
  "上门服务",
  "全套",
  "半套",
] as const;

const V12_RISK_RULES: Array<{ pattern: string; risk_score: number }> = [
  { pattern: "日薪百万", risk_score: 15 },
  { pattern: "妹子优先", risk_score: 5 },
  { pattern: "飞机联系", risk_score: 5 },
  { pattern: "资源", risk_score: 5 },
  { pattern: "资源局", risk_score: 10 },
  { pattern: "兄弟局", risk_score: 10 },
  { pattern: "喝茶", risk_score: 5 },
  { pattern: "内部渠道", risk_score: 10 },
  { pattern: "女生优先", risk_score: 5 },
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const pattern of V12_BLOCK_PATTERNS) {
    const { data: existing } = await supabase
      .from("content_block_rules")
      .select("id")
      .eq("pattern", pattern)
      .maybeSingle();

    const payload = {
      pattern,
      match_type: "keyword" as const,
      scope: ["post", "comment"],
      category: "违规",
      enabled: true,
      priority: 10,
      reason_code: "BLOCKED",
      reason_message: "内容不符合社区规范，无法发布",
    };

    if (existing) {
      const { error } = await supabase
        .from("content_block_rules")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        throw new Error(`Update block rule ${pattern}: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("content_block_rules").insert(payload);
      if (error) {
        throw new Error(`Insert block rule ${pattern}: ${error.message}`);
      }
    }
  }

  const { data: allRiskRules, error: allRiskError } = await supabase
    .from("content_risk_rules")
    .select("id, pattern");

  if (allRiskError) {
    throw new Error(`Load risk rules failed: ${allRiskError.message}`);
  }

  const v12Patterns = new Set(V12_RISK_RULES.map((rule) => rule.pattern));

  for (const rule of allRiskRules ?? []) {
    if (!v12Patterns.has(rule.pattern)) {
      const { error } = await supabase
        .from("content_risk_rules")
        .update({ enabled: false })
        .eq("id", rule.id);
      if (error) {
        throw new Error(`Disable risk rule ${rule.pattern}: ${error.message}`);
      }
    }
  }

  for (const rule of V12_RISK_RULES) {
    if (rule.risk_score <= 0) {
      continue;
    }
    const { data: existing } = await supabase
      .from("content_risk_rules")
      .select("id")
      .eq("pattern", rule.pattern)
      .maybeSingle();

    const payload = {
      pattern: rule.pattern,
      match_type: "keyword" as const,
      scope: ["post", "comment"],
      category: "风险",
      enabled: true,
      priority: 10,
      risk_score: rule.risk_score,
      note: "Content Safety V1.2",
    };

    if (existing) {
      const { error } = await supabase
        .from("content_risk_rules")
        .update(payload)
        .eq("id", existing.id);
      if (error) {
        throw new Error(`Update risk rule ${rule.pattern}: ${error.message}`);
      }
    } else {
      const { error } = await supabase.from("content_risk_rules").insert(payload);
      if (error) {
        throw new Error(`Insert risk rule ${rule.pattern}: ${error.message}`);
      }
    }
  }

  clearModerationRulesCache();
  console.log("Content Safety V1.2 rules applied.");
  console.log(`Block patterns ensured: ${V12_BLOCK_PATTERNS.length}`);
  console.log(`Risk rules active: ${V12_RISK_RULES.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
