import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clearModerationRulesCache,
  loadModerationRules,
} from "../lib/moderation/load-rules";
import { scoreContent } from "../lib/moderation/score-content";
import { publishPostAction } from "../lib/actions/publish-content";
import type { Database } from "../lib/supabase/database.types";

const BLOCK_TEST_PATTERN = "测试拦截词";

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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupRules(
  admin: ReturnType<typeof createClient<Database>>,
  patterns: string[],
) {
  await admin.from("content_block_rules").delete().in("pattern", patterns);
  await admin.from("content_risk_rules").delete().in("pattern", patterns);
  await admin.from("content_whitelist_rules").delete().in("pattern", patterns);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const riskPattern = `规则测试风险词${stamp}`;
  const whitelistPattern = `规则测试白名单${stamp}`;
  const cleanupPatterns = [BLOCK_TEST_PATTERN, riskPattern, whitelistPattern];

  await cleanupRules(admin, cleanupPatterns);
  clearModerationRulesCache();

  const { data: blockRule, error: blockInsertError } = await admin
    .from("content_block_rules")
    .insert({
      pattern: BLOCK_TEST_PATTERN,
      match_type: "keyword",
      scope: ["post", "comment"],
      category: "违规",
      severity: "block",
      reason_code: "BLOCKED",
      reason_message: "内容不符合社区规范，无法发布",
      enabled: true,
      priority: 10,
    })
    .select("id")
    .single();

  assert(!blockInsertError && blockRule, `Insert block rule failed: ${blockInsertError?.message}`);

  clearModerationRulesCache();

  let blocked = false;
  try {
    await publishPostAction({
      title: `拦截测试 ${stamp}`,
      content: `正文包含${BLOCK_TEST_PATTERN}应被拒绝`,
      category: "其他",
      author: "规则测试",
      location: "首尔",
      distance: "350m",
      nearby: true,
      following: false,
    });
  } catch (error) {
    blocked = error instanceof Error && error.message.includes("不符合社区规范");
  }

  assert(blocked, "Post containing block pattern should be rejected");

  const { error: disableError } = await admin
    .from("content_block_rules")
    .update({ enabled: false })
    .eq("id", blockRule.id);

  assert(!disableError, `Disable block rule failed: ${disableError?.message}`);

  clearModerationRulesCache();

  const allowed = await publishPostAction({
    title: `放行测试 ${stamp}`,
    content: `正文包含${BLOCK_TEST_PATTERN}但规则已停用`,
    category: "其他",
    author: "规则测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  assert(allowed.post.id, "Post should publish after block rule disabled");

  await admin.from("posts").delete().eq("id", allowed.post.id);

  const { error: riskInsertError } = await admin.from("content_risk_rules").insert({
    pattern: riskPattern,
    match_type: "keyword",
    scope: ["post", "comment"],
    category: "风险",
    risk_score: 65,
    enabled: true,
    priority: 10,
    note: "admin rules v1 test",
  });

  assert(!riskInsertError, `Insert risk rule failed: ${riskInsertError?.message}`);

  clearModerationRulesCache();
  const rulesWithRisk = await loadModerationRules();
  const riskDecision = scoreContent(
    {
      targetType: "post",
      title: `风险测试 ${stamp}`,
      content: `包含${riskPattern}的内容`,
      category: "其他",
    },
    rulesWithRisk,
  );

  assert(riskDecision.riskScore >= 65, "Risk rule should increase score");
  assert(riskDecision.riskLevel === "medium", "Score 65 should be medium risk");

  const { error: whitelistInsertError } = await admin
    .from("content_whitelist_rules")
    .insert({
      pattern: whitelistPattern,
      match_type: "keyword",
      scope: ["post", "comment"],
      category: "白名单",
      score_reduction: 30,
      force_allow: false,
      enabled: true,
      priority: 10,
      note: "admin rules v1 test",
    });

  assert(
    !whitelistInsertError,
    `Insert whitelist rule failed: ${whitelistInsertError?.message}`,
  );

  clearModerationRulesCache();
  const rulesWithWhitelist = await loadModerationRules();
  const whitelistDecision = scoreContent(
    {
      targetType: "post",
      title: `白名单测试 ${stamp}`,
      content: `同时包含${riskPattern}和${whitelistPattern}`,
      category: "其他",
    },
    rulesWithWhitelist,
  );

  assert(
    whitelistDecision.riskScore === Math.max(0, 65 - 30),
    `Whitelist should reduce score to 35, got ${whitelistDecision.riskScore}`,
  );
  assert(whitelistDecision.riskLevel === "low", "Reduced score should be low risk");

  await cleanupRules(admin, cleanupPatterns);
  clearModerationRulesCache();

  console.log("Admin Rules V1 integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
