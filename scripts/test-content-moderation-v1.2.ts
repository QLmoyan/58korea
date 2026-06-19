import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadModerationRules } from "../lib/moderation/load-rules";
import { scoreContent } from "../lib/moderation/score-content";
import type { Database } from "../lib/supabase/database.types";

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

interface ScenarioResult {
  name: string;
  content: string;
  score: number;
  risk_level: string;
  moderation_status: string;
  content_reviews: boolean;
  frontend_visible: boolean;
  rejected: boolean;
  notice?: string;
}

const SCENARIOS = [
  {
    name: "1. 正常招聘",
    title: "工地招工",
    content: "工地招工 日薪20万韩币 微信联系",
  },
  {
    name: "2. 轻度风险",
    title: "轻度风险测试",
    content: "妹子优先 资源局",
  },
  {
    name: "3. 中风险",
    title: "中风险测试",
    content: "日薪百万 妹子优先 资源局 飞机联系",
  },
  {
    name: "4. 高风险",
    title: "高风险测试",
    content: "日薪百万 妹子优先 资源局 飞机联系 兄弟局 内部渠道 喝茶",
  },
  {
    name: "5. block",
    title: "block测试",
    content: "找小姐 包夜 特殊服务",
  },
];

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rules = await loadModerationRules();
  const stamp = Date.now();
  const createdPostIds: number[] = [];
  const createdReviewTargetIds: string[] = [];
  const results: ScenarioResult[] = [];

  for (const scenario of SCENARIOS) {
    const decision = scoreContent(
      {
        targetType: "post",
        title: scenario.title,
        content: scenario.content,
        category: "招聘",
      },
      rules,
    );

    if (decision.rejected) {
      results.push({
        name: scenario.name,
        content: scenario.content,
        score: decision.riskScore,
        risk_level: decision.riskLevel,
        moderation_status: decision.moderationStatus,
        content_reviews: false,
        frontend_visible: false,
        rejected: true,
        notice: decision.userMessage,
      });
      continue;
    }

    const now = new Date().toISOString();
    const isPublished = decision.moderationStatus === "published";

    const { data: post, error: postError } = await admin
      .from("posts")
      .insert({
        title: `${scenario.title} ${stamp}`,
        content: scenario.content,
        author: "V1.2测试",
        location: "首尔",
        distance: "350m",
        likes: 0,
        category: "招聘",
        image_url: null,
        image_height: 180,
        nearby: true,
        following: false,
        moderation_status: decision.moderationStatus,
        risk_score: decision.riskScore,
        risk_level: decision.riskLevel,
        published_at: isPublished ? now : null,
        moderation_note: decision.userMessage ?? null,
      })
      .select("id")
      .single();

    if (postError || !post) {
      throw new Error(`${scenario.name} insert failed: ${postError?.message}`);
    }

    createdPostIds.push(post.id);

    let hasReview = false;
    if (decision.shouldCreateReview) {
      const { data: review, error: reviewError } = await admin
        .from("content_reviews")
        .insert({
          target_type: "post",
          target_id: String(post.id),
          post_id: post.id,
          risk_score: decision.riskScore,
          risk_level: decision.riskLevel === "high" ? "high" : "medium",
          status: "open",
          matched_block_rules: [],
          matched_risk_rules: decision.matchedRiskRules,
          matched_whitelist_rules: decision.matchedWhitelistRules,
          content_snapshot: {
            title: scenario.title,
            content: scenario.content,
            category: "招聘",
          },
        })
        .select("id")
        .single();

      if (reviewError || !review) {
        throw new Error(`${scenario.name} review failed: ${reviewError?.message}`);
      }

      hasReview = true;
      createdReviewTargetIds.push(String(post.id));
    }

    const { data: anonPost } = await anon
      .from("posts")
      .select("id")
      .eq("id", post.id)
      .eq("moderation_status", "published")
      .maybeSingle();

    results.push({
      name: scenario.name,
      content: scenario.content,
      score: decision.riskScore,
      risk_level: decision.riskLevel,
      moderation_status: decision.moderationStatus,
      content_reviews: hasReview,
      frontend_visible: Boolean(anonPost),
      rejected: false,
      notice: decision.userMessage,
    });
  }

  if (createdReviewTargetIds.length > 0) {
    await admin
      .from("content_reviews")
      .delete()
      .in("target_id", createdReviewTargetIds);
  }

  if (createdPostIds.length > 0) {
    await admin.from("posts").delete().in("id", createdPostIds);
  }

  console.log("\nContent Safety V1.2 test results:\n");
  console.table(
    results.map((item) => ({
      场景: item.name,
      score: item.score,
      risk_level: item.risk_level,
      moderation_status: item.moderation_status,
      content_reviews: item.content_reviews,
      前台可见: item.frontend_visible,
      拒绝: item.rejected,
    })),
  );

  for (const item of results) {
    console.log(`\n${item.name}`);
    console.log(`  内容: ${item.content}`);
    console.log(`  score: ${item.score}`);
    console.log(`  risk_level: ${item.risk_level}`);
    console.log(`  moderation_status: ${item.moderation_status}`);
    console.log(`  content_reviews: ${item.content_reviews}`);
    console.log(`  前台可见: ${item.frontend_visible}`);
    if (item.notice) {
      console.log(`  提示: ${item.notice}`);
    }
  }

  console.log("\nContent Safety V1.2 tests completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
