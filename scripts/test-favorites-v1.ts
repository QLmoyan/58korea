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
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const username = `fav_${String(stamp).slice(-7)}`;
  const password = "Test123456!";

  await registerUserAction({
    username,
    password,
    nickname: `收藏测试${String(stamp).slice(-4)}`,
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

  const { data: publishedPost, error: postError } = await supabase
    .from("posts")
    .select("id, title, moderation_status")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!postError, postError?.message ?? "failed to load post");
  assert(publishedPost?.id, "no published post found for favorites test");

  const postId = publishedPost.id;

  const { error: favoriteInsertError } = await supabase
    .from("post_favorites")
    .insert({
      user_id: user.id,
      post_id: postId,
    });
  assert(
    !favoriteInsertError,
    `favorite insert failed: ${favoriteInsertError?.message}`,
  );

  const { error: duplicateInsertError } = await supabase
    .from("post_favorites")
    .insert({
      user_id: user.id,
      post_id: postId,
    });
  assert(duplicateInsertError, "duplicate favorite insert should fail");

  const { data: orderedFavorites, error: orderedError } = await supabase
    .from("post_favorites")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  assert(!orderedError, orderedError?.message ?? "failed to read favorites");
  assert(orderedFavorites?.[0]?.post_id === postId, "favorite order mismatch");

  const { data: favoritePosts, error: favoritePostsError } = await supabase
    .from("posts")
    .select("id")
    .in("id", [postId])
    .eq("moderation_status", "published");
  assert(
    !favoritePostsError,
    favoritePostsError?.message ?? "failed to read favorite post",
  );
  assert(favoritePosts?.length === 1, "published favorite post should resolve");

  const { data: tempPost, error: tempPostError } = await service
    .from("posts")
    .insert({
      title: `收藏删除测试${String(stamp).slice(-4)}`,
      content: "favorite cascade test",
      author: "收藏测试",
      location: "首尔",
      distance: "100m",
      category: "其他",
      category_source: "manual",
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      likes: 0,
      nearby: false,
      following: false,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  assert(!tempPostError, tempPostError?.message ?? "failed to create temp post");
  assert(tempPost?.id, "missing temp post id");

  const tempPostId = tempPost.id;

  const { error: tempFavoriteError } = await supabase
    .from("post_favorites")
    .insert({
      user_id: user.id,
      post_id: tempPostId,
    });
  assert(
    !tempFavoriteError,
    `temp favorite insert failed: ${tempFavoriteError?.message}`,
  );

  const { error: deletePostError } = await service
    .from("posts")
    .delete()
    .eq("id", tempPostId);
  assert(!deletePostError, deletePostError?.message ?? "failed to delete temp post");

  const { data: cascadeRows, error: cascadeError } = await supabase
    .from("post_favorites")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", tempPostId);
  assert(!cascadeError, cascadeError?.message ?? "failed to read cascade favorites");
  assert(cascadeRows?.length === 0, "favorite row should cascade delete with post");

  const { error: favoriteDeleteError } = await supabase
    .from("post_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);
  assert(
    !favoriteDeleteError,
    `favorite delete failed: ${favoriteDeleteError?.message}`,
  );

  console.log("PASS: scripts/test-favorites-v1.ts");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
