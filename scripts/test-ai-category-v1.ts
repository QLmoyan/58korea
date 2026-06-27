import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyPostCategory,
  getAllowedPostCategories,
} from "../lib/ai/classify-post-category";
import { publishPostAction } from "../lib/actions/publish-content";
import { POST_CATEGORIES, isPostCategory } from "../lib/data/posts";
import { resolvePostCategoryForPublish } from "../lib/posts/resolve-post-category";
import type { Database } from "../lib/supabase/database.types";

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
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupPost(
  service: ReturnType<typeof createClient<Database>>,
  postId: number,
) {
  await service.from("content_reviews").delete().eq("post_id", postId);
  await service.from("posts").delete().eq("id", postId);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && serviceRoleKey, "Missing Supabase env vars");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: columnError } = await service
    .from("posts")
    .select("category_source, ai_category_confidence, ai_category_reason")
    .limit(1);
  assert(!columnError, `posts AI category columns missing: ${columnError?.message}`);

  assert(
    POST_CATEGORIES.length === 7,
    `expected 7 categories, got ${POST_CATEGORIES.length}`,
  );
  for (const category of getAllowedPostCategories()) {
    assert(isPostCategory(category), `invalid allowed category: ${category}`);
  }

  const stamp = Date.now();

  console.log("1) manual category saves category_source=manual");
  const manualPublish = await publishPostAction({
    title: `AI分类手动测试 ${stamp}`,
    content: "这是一条手动选择二手分类的测试帖",
    categorySelection: "二手",
    author: "AI分类测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  const { data: manualRow, error: manualRowError } = await service
    .from("posts")
    .select("category, category_source, ai_category_confidence, ai_category_reason")
    .eq("id", manualPublish.post.id)
    .single();
  assert(!manualRowError && manualRow, manualRowError?.message ?? "manual row missing");
  assert(manualRow.category === "二手", "manual row category mismatch");
  assert(manualRow.category_source === "manual", "manual row source mismatch");
  assert(manualRow.ai_category_confidence === null, "manual confidence should be null");
  await cleanupPost(service, manualPublish.post.id);
  console.log("   PASS");

  console.log("2) AI success saves category_source=ai");
  const aiResolved = await resolvePostCategoryForPublish(
    {
      categorySelection: "ai",
      title: "建大附近烤肉店推荐",
      content: "周末去吃了这家韩式烤肉，味道不错，服务也好。",
    },
    {
      classify: async () => ({
        ok: true,
        category: "探店",
        confidence: 0.91,
        reason: "分享餐厅体验",
      }),
    },
  );
  assert(aiResolved.category === "探店", "ai category mismatch");
  assert(aiResolved.categorySource === "ai", "ai source mismatch");
  assert(aiResolved.aiCategoryConfidence === 0.91, "ai confidence mismatch");

  const { data: aiInsertedRow, error: aiInsertError } = await service
    .from("posts")
    .insert({
      title: `AI分类写入测试 ${stamp}`,
      content: "AI 分类成功写入测试",
      author: "AI分类测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: aiResolved.category,
      category_source: aiResolved.categorySource,
      ai_category_confidence: aiResolved.aiCategoryConfidence,
      ai_category_reason: aiResolved.aiCategoryReason,
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id, category, category_source, ai_category_confidence")
    .single();
  assert(!aiInsertError && aiInsertedRow, aiInsertError?.message ?? "ai insert failed");
  assert(aiInsertedRow.category_source === "ai", "ai insert source mismatch");
  assert(aiInsertedRow.category === "探店", "ai insert category mismatch");
  await cleanupPost(service, aiInsertedRow.id);
  console.log("   PASS");

  console.log("3) AI failure falls back to 其他 + ai_fallback");
  const fallbackPublish = await publishPostAction({
    title: `AI分类兜底测试 ${stamp}`,
    content: "AI 失败兜底测试内容",
    categorySelection: "ai",
    author: "AI分类测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  if (process.env.OPENAI_API_KEY?.trim()) {
    assert(
      isPostCategory(fallbackPublish.post.category),
      "fallback publish category must be valid",
    );
  } else {
    const { data: fallbackRow } = await service
      .from("posts")
      .select("category, category_source, ai_category_reason")
      .eq("id", fallbackPublish.post.id)
      .single();
    assert(fallbackRow?.category === "其他", "fallback category mismatch");
    assert(fallbackRow?.category_source === "ai_fallback", "fallback source mismatch");
    assert(fallbackRow?.ai_category_reason, "fallback reason should be recorded");
  }

  await cleanupPost(service, fallbackPublish.post.id);
  console.log("   PASS");

  console.log("4) classifier only returns fixed 7 categories");
  if (!process.env.OPENAI_API_KEY?.trim()) {
    const missingKey = await classifyPostCategory("x", "y");
    assert(!missingKey.ok, "missing key should fail fast");
  }

  const invalidCategory = await resolvePostCategoryForPublish(
    {
      categorySelection: "ai",
      title: "invalid category response",
      content: "test",
    },
    {
      classify: async () => ({
        ok: true,
        category: "违规分类" as "探店",
        confidence: 0.5,
        reason: "invalid",
      }),
    },
  );
  assert(invalidCategory.category === "其他", "invalid ai category should fallback");
  assert(
    invalidCategory.categorySource === "ai_fallback",
    "invalid ai should use fallback",
  );
  console.log("   PASS");

  console.log("\nAll AI category V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
