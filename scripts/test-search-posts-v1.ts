import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEARCH_RESULT_LIMIT } from "../lib/search/escape-ilike";
import { searchPosts } from "../lib/search/search-posts";
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

function buildPublishedPostInsert(stamp: number, overrides: Record<string, string>) {
  return {
    title: overrides.title ?? `搜索帖标题${stamp}`,
    content: overrides.content ?? `搜索帖正文${stamp}`,
    author: overrides.author ?? `搜索作者${stamp}`,
    location: "首尔",
    distance: "350m",
    likes: 0,
    category: "其他",
    image_url: null,
    image_height: 180,
    nearby: true,
    following: false,
    moderation_status: "published" as const,
    risk_score: 0,
    risk_level: "low" as const,
    published_at: new Date().toISOString(),
  };
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const titleToken = `SRCHTITLE${String(stamp).slice(-6)}`;
  const contentToken = `SRCHBODY${String(stamp).slice(-6)}`;
  const authorToken = `SRCHAUTH${String(stamp).slice(-6)}`;
  const limitToken = `SRCHLIMIT${String(stamp).slice(-6)}`;
  const createdPostIds: number[] = [];

  async function insertPost(overrides: Record<string, string>) {
    const { data, error } = await service
      .from("posts")
      .insert(buildPublishedPostInsert(stamp, overrides))
      .select("id")
      .single();
    assert(!error && data?.id, error?.message ?? "failed to insert test post");
    createdPostIds.push(data.id);
    return data.id;
  }

  console.log("1) search posts by title");
  await insertPost({ title: `${titleToken} 韩国租房` });
  const byTitle = await searchPosts(titleToken);
  assert(byTitle.some((post) => post.title.includes(titleToken)), "title search failed");
  console.log("   PASS");

  console.log("2) search posts by content");
  await insertPost({
    title: `普通标题${stamp}`,
    content: `${contentToken} 详细说明`,
  });
  const byContent = await searchPosts(contentToken);
  assert(
    byContent.some((post) => (post.content ?? "").includes(contentToken)),
    "content search failed",
  );
  console.log("   PASS");

  console.log("3) search posts by author");
  await insertPost({
    title: `作者测试帖${stamp}`,
    author: `${authorToken}昵称`,
  });
  const byAuthor = await searchPosts(authorToken);
  assert(byAuthor.some((post) => post.author.includes(authorToken)), "author search failed");
  console.log("   PASS");

  console.log("4) special characters do not break search");
  const specialPosts = await searchPosts("100%,测试");
  assert(Array.isArray(specialPosts), "special character search should return array");
  console.log("   PASS");

  console.log("5) search results respect SEARCH_RESULT_LIMIT");
  for (let index = 0; index < SEARCH_RESULT_LIMIT + 5; index += 1) {
    await insertPost({
      title: `${limitToken}-${index}`,
      content: `${limitToken} batch`,
      author: `limit作者${stamp}`,
    });
  }
  const limited = await searchPosts(limitToken);
  assert(limited.length === SEARCH_RESULT_LIMIT, `expected ${SEARCH_RESULT_LIMIT} results`);
  console.log("   PASS");

  console.log("6) search posts rank exact title before content match");
  const rankToken = `SRCHRANK${String(stamp).slice(-6)}`;
  const contentOnlyId = await insertPost({
    title: `普通标题${stamp}`,
    content: `说明${rankToken}结尾`,
  });
  const prefixTitleId = await insertPost({
    title: `${rankToken}攻略`,
    content: "正文",
  });
  const exactTitleId = await insertPost({
    title: rankToken,
    content: "正文",
  });

  const ranked = await searchPosts(rankToken);
  const rankedIds = ranked.map((post) => post.id);
  const exactIndex = rankedIds.indexOf(exactTitleId);
  const prefixIndex = rankedIds.indexOf(prefixTitleId);
  const contentIndex = rankedIds.indexOf(contentOnlyId);
  assert(exactIndex >= 0 && prefixIndex >= 0 && contentIndex >= 0, "ranking fixtures missing");
  assert(exactIndex < prefixIndex, "exact title should rank above prefix title");
  assert(prefixIndex < contentIndex, "prefix title should rank above content match");
  console.log("   PASS");

  await service.from("posts").delete().in("id", createdPostIds);

  console.log("\nAll search posts DB V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
