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

  const { data: publishedPost, error: postError } = await supabase
    .from("posts")
    .select("id, likes")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!postError, postError?.message ?? "failed to load post");
  assert(publishedPost?.id, "no published post found for engagement test");

  const postId = publishedPost.id;
  const initialLikes = publishedPost.likes;
  const stamp = Date.now();
  const username = `like_${String(stamp).slice(-7)}`;
  const password = "Test123456!";

  await registerUserAction({
    username,
    password,
    nickname: `点赞测试${String(stamp).slice(-4)}`,
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

  const { error: likeInsertError } = await supabase.from("post_likes").insert({
    user_id: user.id,
    post_id: postId,
  });
  assert(!likeInsertError, `like insert failed: ${likeInsertError?.message}`);

  const { data: likedPost, error: likedPostError } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .single();
  assert(!likedPostError, likedPostError?.message ?? "failed to read likes");
  assert(
    likedPost.likes === initialLikes + 1,
    `likes should increment (got ${likedPost.likes}, expected ${initialLikes + 1})`,
  );

  const { error: likeDeleteError } = await supabase
    .from("post_likes")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);
  assert(!likeDeleteError, `like delete failed: ${likeDeleteError?.message}`);

  const { data: unlikedPost, error: unlikedPostError } = await supabase
    .from("posts")
    .select("likes")
    .eq("id", postId)
    .single();
  assert(!unlikedPostError, unlikedPostError?.message ?? "failed to read likes");
  assert(
    unlikedPost.likes === initialLikes,
    `likes should return to initial (got ${unlikedPost.likes}, expected ${initialLikes})`,
  );

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

  const { data: favorites, error: favoritesError } = await supabase
    .from("post_favorites")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId);
  assert(!favoritesError, favoritesError?.message ?? "failed to read favorites");
  assert(favorites?.length === 1, "favorite row should exist");

  const { error: favoriteDeleteError } = await supabase
    .from("post_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("post_id", postId);
  assert(
    !favoriteDeleteError,
    `favorite delete failed: ${favoriteDeleteError?.message}`,
  );

  console.log("Post engagement V1 test passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
