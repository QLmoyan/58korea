import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publishPostAction } from "../lib/actions/publish-content";
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

  const stamp = Date.now();
  const result = await publishPostAction({
    title: `publish smoke ${stamp}`,
    content: "publishPostAction smoke test",
    category: "其他",
    author: "冒烟测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  assert(result.post.id, "publishPostAction did not return post id");
  console.log(`OK publishPostAction returned post id=${result.post.id}`);

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await admin.from("content_reviews").delete().eq("post_id", result.post.id);
  await admin.from("posts").delete().eq("id", result.post.id);

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: post } = await anon
    .from("posts")
    .select("id")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(post?.id, "No published post for comments read test");

  const { error: commentsError } = await anon
    .from("comments")
    .select("id, content")
    .eq("post_id", post.id)
    .eq("moderation_status", "published")
    .limit(5);

  assert(!commentsError, `comments SELECT failed: ${commentsError?.message}`);
  console.log(`OK anon comments SELECT on post_id=${post.id}`);

  console.log("\nPublish + comments read verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
