import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publishCommentAction, publishPostAction } from "../lib/actions/publish-content";
import {
  clearModerationRulesCache,
  loadModerationRules,
} from "../lib/moderation/load-rules";
import { scoreContent } from "../lib/moderation/score-content";
import type { Database } from "../lib/supabase/database.types";

const BLOCK_PATTERN = "V21测试拦截词";
const RISK_PATTERN = "V21测试风险词";
const WHITELIST_PATTERN = "V21测试白名单词";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanup(
  admin: ReturnType<typeof createClient<Database>>,
  patterns: string[],
  postIds: number[],
) {
  if (postIds.length) {
    await admin.from("content_reviews").delete().in("post_id", postIds);
    await admin.from("posts").delete().in("id", postIds);
  }
  await admin.from("content_block_rules").delete().in("pattern", patterns);
  await admin.from("content_risk_rules").delete().in("pattern", patterns);
  await admin.from("content_whitelist_rules").delete().in("pattern", patterns);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceRoleKey, "Missing Supabase env");

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const patterns = [BLOCK_PATTERN, RISK_PATTERN, WHITELIST_PATTERN];
  const postIds: number[] = [];

  await cleanup(admin, patterns, postIds);
  clearModerationRulesCache();

  const { data: blockRule } = await admin
    .from("content_block_rules")
    .insert({
      pattern: BLOCK_PATTERN,
      match_type: "keyword",
      scope: ["post", "comment"],
      category: "违规",
      severity: "block",
      reason_code: "BLOCKED",
      reason_message: "内容不符合社区规范，无法发布",
      enabled: true,
      priority: 10,
      hit_count: 0,
    })
    .select("id, hit_count")
    .single();

  const { data: riskRule } = await admin
    .from("content_risk_rules")
    .insert({
      pattern: RISK_PATTERN,
      match_type: "keyword",
      scope: ["post", "comment"],
      category: "风险",
      risk_score: 70,
      enabled: true,
      priority: 10,
      note: "ops v2.1 test",
      hit_count: 0,
    })
    .select("id, hit_count")
    .single();

  const { data: whitelistRule } = await admin
    .from("content_whitelist_rules")
    .insert({
      pattern: WHITELIST_PATTERN,
      match_type: "keyword",
      scope: ["post", "comment"],
      category: "白名单",
      score_reduction: 70,
      force_allow: false,
      enabled: true,
      priority: 10,
      note: "ops v2.1 test",
      hit_count: 0,
    })
    .select("id, hit_count")
    .single();

  assert(blockRule && riskRule && whitelistRule, "Failed to seed test rules");
  clearModerationRulesCache();

  const rules = await loadModerationRules();
  const testerDecision = scoreContent(
    {
      targetType: "post",
      title: "规则测试器",
      content: `${RISK_PATTERN} ${WHITELIST_PATTERN}`,
      category: "其他",
    },
    rules,
  );

  assert(testerDecision.riskScore === 0, "Tester score should be 0 after whitelist");
  assert(
    testerDecision.matchedRiskRules.some((rule) => rule.pattern === RISK_PATTERN),
    "Tester should match risk rule",
  );

  const { data: riskAfterTester } = await admin
    .from("content_risk_rules")
    .select("hit_count")
    .eq("id", riskRule.id)
    .single();
  assert(Number(riskAfterTester?.hit_count) === 0, "Rule tester must not increment hit_count");

  let rejected = false;
  try {
    await publishPostAction({
      title: `block ${stamp}`,
      content: BLOCK_PATTERN,
      category: "其他",
      author: "V21测试",
      location: "首尔",
      distance: "350m",
      nearby: true,
      following: false,
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "Blocked post should reject");

  const { data: blockAfterReject } = await admin
    .from("content_block_rules")
    .select("hit_count, last_hit_at")
    .eq("id", blockRule.id)
    .single();
  assert(Number(blockAfterReject?.hit_count) === 1, "Block reject should increment hit_count");
  assert(blockAfterReject?.last_hit_at, "Block reject should set last_hit_at");

  await admin.from("content_block_rules").update({ enabled: false }).eq("id", blockRule.id);
  clearModerationRulesCache();

  const allowed = await publishPostAction({
    title: `allow ${stamp}`,
    content: `${RISK_PATTERN} only`,
    category: "其他",
    author: "V21测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });
  postIds.push(allowed.post.id);
  assert(allowed.post.riskScore === 70, "Risk post score should be 70");
  assert(allowed.post.riskLevel === "medium", "Risk post should be medium");

  const { data: riskAfterPublish } = await admin
    .from("content_risk_rules")
    .select("hit_count, last_hit_at")
    .eq("id", riskRule.id)
    .single();
  assert(Number(riskAfterPublish?.hit_count) === 1, "Risk publish should increment hit_count");

  const { data: reviewRow } = await admin
    .from("content_reviews")
    .select("id, risk_level, status")
    .eq("target_type", "post")
    .eq("target_id", String(allowed.post.id))
    .maybeSingle();
  assert(reviewRow?.risk_level === "medium", "Medium post should create content_reviews");

  const combined = await publishPostAction({
    title: `combined ${stamp}`,
    content: `${RISK_PATTERN} ${WHITELIST_PATTERN}`,
    category: "其他",
    author: "V21测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });
  postIds.push(combined.post.id);
  assert(combined.post.riskScore === 0, "Combined post score should be 0");

  const { data: whitelistAfterPublish } = await admin
    .from("content_whitelist_rules")
    .select("hit_count")
    .eq("id", whitelistRule.id)
    .single();
  assert(Number(whitelistAfterPublish?.hit_count) === 1, "Whitelist should increment on publish");

  const commentId = randomUUID();
  await publishCommentAction({
    id: commentId,
    postId: combined.post.id,
    author: "V21测试",
    content: `${RISK_PATTERN} comment`,
  });

  const { data: riskAfterComment } = await admin
    .from("content_risk_rules")
    .select("hit_count")
    .eq("id", riskRule.id)
    .single();
  assert(Number(riskAfterComment?.hit_count) === 3, "Comment hit should increment risk rule again");

  await admin.from("comments").delete().eq("id", commentId);

  const { data: sortedRules } = await admin
    .from("content_risk_rules")
    .select("pattern, hit_count")
    .in("pattern", patterns)
    .order("hit_count", { ascending: false });
  assert(
    sortedRules?.[0]?.pattern === RISK_PATTERN,
    "Risk rule should sort first by hit_count",
  );

  const { count: openReviews } = await admin
    .from("content_reviews")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  const { count: openReports } = await admin
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  assert(openReviews !== null && openReports !== null, "Queues should remain queryable");

  await cleanup(admin, patterns, postIds);
  clearModerationRulesCache();

  console.log("Operations Center V2.1 integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
