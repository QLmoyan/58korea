import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { loadModerationRules } from "../lib/moderation/load-rules";
import { scoreContent } from "../lib/moderation/score-content";
import {
  MODERATION_HIGH_MIN,
  MODERATION_LOW_MAX,
} from "../lib/moderation/constants";
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY");

  const rules = await loadModerationRules();
  assert(
    rules.blockRules.length === 19,
    `Expected 19 block rules, got ${rules.blockRules.length}`,
  );
  assert(
    rules.riskRules.length === 12,
    `Expected 12 risk rules, got ${rules.riskRules.length}`,
  );
  assert(
    rules.whitelistRules.length === 23,
    `Expected 23 whitelist rules, got ${rules.whitelistRules.length}`,
  );
  console.log("Rule counts OK: block 19, risk 12, whitelist 23");

  const postBlockRule = rules.blockRules.find((rule) =>
    rule.scope.includes("post"),
  );
  assert(postBlockRule, "No post block rule found");

  const blockDecision = scoreContent(
    {
      targetType: "post",
      title: "测试标题",
      content: `正常内容 ${postBlockRule.pattern} 测试`,
      category: "其他",
    },
    rules,
  );
  assert(blockDecision.rejected, "Block rule should reject content");
  assert(!blockDecision.visible, "Blocked content should not be visible");
  console.log(`Block rule OK: pattern "${postBlockRule.pattern}"`);

  const lowDecision = scoreContent(
    {
      targetType: "post",
      title: "首尔生活分享",
      content: "今天天气不错，分享一下在弘大附近散步的体验。",
      category: "攻略",
    },
    rules,
  );
  assert(!lowDecision.rejected, "Normal content should not be rejected");
  assert(lowDecision.moderationStatus === "published", "Low risk should publish");
  assert(lowDecision.visible, "Low risk should be visible");
  assert(!lowDecision.shouldCreateReview, "Low risk should not create review");
  console.log(`Low risk OK: score=${lowDecision.riskScore}`);

  const postRiskRules = rules.riskRules.filter((rule) =>
    rule.scope.includes("post"),
  );
  assert(postRiskRules.length > 0, "No post risk rules found");

  let mediumContent = "测试内容";
  let mediumScore = 0;
  for (const rule of postRiskRules) {
    mediumContent += ` ${rule.pattern}`;
    mediumScore += rule.risk_score;
    if (mediumScore > MODERATION_LOW_MAX && mediumScore < MODERATION_HIGH_MIN) {
      break;
    }
  }

  const mediumDecision = scoreContent(
    {
      targetType: "post",
      title: "中风险测试",
      content: mediumContent,
      category: "其他",
    },
    rules,
  );
  assert(!mediumDecision.rejected, "Medium risk should not be rejected");
  assert(
    mediumDecision.moderationStatus === "published",
    "Medium risk should publish",
  );
  assert(mediumDecision.shouldCreateReview, "Medium risk should create review");
  assert(mediumDecision.visible, "Medium risk should be visible");
  console.log(`Medium risk OK: score=${mediumDecision.riskScore}`);

  let highContent = "测试内容";
  let highScore = 0;
  for (const rule of postRiskRules) {
    highContent += ` ${rule.pattern}`;
    highScore += rule.risk_score;
    if (highScore >= MODERATION_HIGH_MIN) {
      break;
    }
  }
  assert(highScore >= MODERATION_HIGH_MIN, "Could not build high-risk content");

  const highDecision = scoreContent(
    {
      targetType: "post",
      title: "高风险测试",
      content: highContent,
      category: "其他",
    },
    rules,
  );
  assert(!highDecision.rejected, "High risk should not be hard-rejected");
  assert(
    highDecision.moderationStatus === "pending_review",
    "High risk should be pending_review",
  );
  assert(highDecision.shouldCreateReview, "High risk should create review");
  assert(!highDecision.visible, "High risk should not be visible");
  console.log(`High risk OK: score=${highDecision.riskScore}`);

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const createdPostIds: number[] = [];
  const createdReviewIds: string[] = [];

  async function insertModeratedPost(
    label: string,
    decision: ReturnType<typeof scoreContent>,
    content: string,
  ) {
    const now = new Date().toISOString();
    const isPublished = decision.moderationStatus === "published";

    const { data, error } = await admin
      .from("posts")
      .insert({
        title: `${label} ${stamp}`,
        content,
        author: "审核测试",
        location: "首尔",
        distance: "350m",
        likes: 0,
        category: "其他",
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

    assert(!error && data, `Insert ${label} post failed: ${error?.message}`);
    createdPostIds.push(data.id);

    if (decision.shouldCreateReview) {
      const { data: review, error: reviewError } = await admin
        .from("content_reviews")
        .insert({
          target_type: "post",
          target_id: String(data.id),
          post_id: data.id,
          risk_score: decision.riskScore,
          risk_level: decision.riskLevel === "high" ? "high" : "medium",
          status: "open",
          matched_block_rules: decision.matchedBlockRules as unknown as Database["public"]["Tables"]["content_reviews"]["Insert"]["matched_block_rules"],
          matched_risk_rules: decision.matchedRiskRules as unknown as Database["public"]["Tables"]["content_reviews"]["Insert"]["matched_risk_rules"],
          matched_whitelist_rules: decision.matchedWhitelistRules as unknown as Database["public"]["Tables"]["content_reviews"]["Insert"]["matched_whitelist_rules"],
          content_snapshot: {
            title: `${label} ${stamp}`,
            content,
            category: "其他",
            author: "审核测试",
          } as unknown as Database["public"]["Tables"]["content_reviews"]["Insert"]["content_snapshot"],
        })
        .select("id")
        .single();

      assert(
        !reviewError && review,
        `Insert ${label} review failed: ${reviewError?.message}`,
      );
      createdReviewIds.push(review.id);
    }

    return data.id;
  }

  const publishedId = await insertModeratedPost(
    "published",
    lowDecision,
    "今天天气不错，分享一下在弘大附近散步的体验。",
  );
  const mediumId = await insertModeratedPost("medium", mediumDecision, mediumContent);
  const pendingId = await insertModeratedPost("pending", highDecision, highContent);

  const { data: anonPublishedList, error: anonListError } = await anon
    .from("posts")
    .select("id")
    .eq("moderation_status", "published")
    .in("id", [publishedId, mediumId, pendingId]);

  assert(!anonListError, `Anon list query failed: ${anonListError?.message}`);
  const visibleIds = new Set((anonPublishedList ?? []).map((row) => row.id));
  assert(visibleIds.has(publishedId), "Published post should appear in anon list");
  assert(visibleIds.has(mediumId), "Medium post should appear in anon list");
  assert(!visibleIds.has(pendingId), "Pending post should not appear in anon list");
  console.log("Anon post visibility filter OK");

  const commentBlockRule = rules.blockRules.find((rule) =>
    rule.scope.includes("comment"),
  );
  assert(commentBlockRule, "No comment block rule found");

  const commentBlockDecision = scoreContent(
    {
      targetType: "comment",
      content: `留言 ${commentBlockRule.pattern}`,
    },
    rules,
  );
  assert(commentBlockDecision.rejected, "Comment block rule should reject");

  const commentId = randomUUID();
  const commentDecision = scoreContent(
    {
      targetType: "comment",
      content: mediumContent,
    },
    rules,
  );

  const commentNow = new Date().toISOString();
  const commentPublished = commentDecision.moderationStatus === "published";
  const { error: commentInsertError } = await admin.from("comments").insert({
    id: commentId,
    post_id: publishedId,
    author: "审核测试",
    content: mediumContent,
    parent_id: null,
    reply_to_author: null,
    moderation_status: commentDecision.moderationStatus,
    risk_score: commentDecision.riskScore,
    risk_level: commentDecision.riskLevel,
    published_at: commentPublished ? commentNow : null,
  });
  assert(!commentInsertError, `Comment insert failed: ${commentInsertError?.message}`);

  const { data: anonComments, error: anonCommentsError } = await anon
    .from("comments")
    .select("id")
    .eq("post_id", publishedId)
    .eq("moderation_status", "published")
    .eq("id", commentId);

  assert(!anonCommentsError, `Anon comments query failed: ${anonCommentsError?.message}`);
  if (commentPublished) {
    assert((anonComments ?? []).length === 1, "Published comment should be visible");
  }

  console.log("Comment moderation OK");

  await admin.from("content_reviews").delete().in("id", createdReviewIds);
  await admin.from("comments").delete().eq("post_id", publishedId);
  await admin.from("posts").delete().in("id", createdPostIds);

  console.log("Content Safety V1B integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
