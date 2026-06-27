import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
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

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(url && anonKey, "Missing Supabase env vars");

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: publishedPosts, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(2);

  assert(!postError, postError?.message ?? "failed to load posts");
  assert(publishedPosts && publishedPosts.length >= 1, "need at least one published post");

  const [firstPost, secondPost] = publishedPosts;
  const stamp = Date.now();
  const username = `view_${String(stamp).slice(-7)}`;
  const password = "Test123456!";

  await registerUserAction({
    username,
    password,
    nickname: `浏览测试${String(stamp).slice(-4)}`,
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  assert(!signInError, `sign in failed: ${signInError?.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  assert(user?.id, "missing auth user");

  const { error: firstViewError } = await supabase.from("post_views").upsert(
    {
      user_id: user.id,
      post_id: firstPost.id,
      viewed_at: new Date(stamp - 1000).toISOString(),
    },
    { onConflict: "user_id,post_id" },
  );
  assert(!firstViewError, `first view failed: ${firstViewError?.message}`);

  if (secondPost) {
    const { error: secondViewError } = await supabase.from("post_views").upsert(
      {
        user_id: user.id,
        post_id: secondPost.id,
        viewed_at: new Date(stamp).toISOString(),
      },
      { onConflict: "user_id,post_id" },
    );
    assert(!secondViewError, `second view failed: ${secondViewError?.message}`);
  }

  const { error: refreshViewError } = await supabase.from("post_views").upsert(
    {
      user_id: user.id,
      post_id: firstPost.id,
      viewed_at: new Date(stamp + 1000).toISOString(),
    },
    { onConflict: "user_id,post_id" },
  );
  assert(!refreshViewError, `refresh view failed: ${refreshViewError?.message}`);

  const { data: views, error: viewsError } = await supabase
    .from("post_views")
    .select("post_id, viewed_at")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false });

  assert(!viewsError, viewsError?.message ?? "failed to read views");
  assert(views && views.length >= 1, "view history should not be empty");
  assert(
    views[0]?.post_id === firstPost.id,
    "most recently viewed post should be first",
  );

  console.log("Post views V1 test passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
