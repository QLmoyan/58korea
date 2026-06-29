import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toInternalEmail } from "../lib/auth/username";
import {
  fetchUserProfileComments,
  PROFILE_COMMENTS_PAGE_SIZE,
} from "../lib/supabase/profile-comment-queries";
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

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: publishedPost, error: postError } = await service
    .from("posts")
    .select("id, title")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!postError, postError?.message ?? "failed to load post");
  assert(publishedPost?.id, "need at least one published post");

  const stamp = Date.now();
  const username = `pc_${String(stamp).slice(-7)}`;
  const otherUsername = `pco_${String(stamp).slice(-6)}`;
  const password = "Test123456!";

  const { error: createUserError } = await service.auth.admin.createUser({
    email: toInternalEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username, nickname: "评论V2测试" },
  });
  assert(!createUserError, createUserError?.message ?? "create user failed");

  const { error: createOtherError } = await service.auth.admin.createUser({
    email: toInternalEmail(otherUsername),
    password,
    email_confirm: true,
    user_metadata: { username: otherUsername, nickname: "他人" },
  });
  assert(!createOtherError, createOtherError?.message ?? "create other user failed");

  const { data: listedUsers } = await service.auth.admin.listUsers();
  const user = listedUsers.users.find((entry) => entry.email === toInternalEmail(username));
  const otherUser = listedUsers.users.find(
    (entry) => entry.email === toInternalEmail(otherUsername),
  );
  assert(user?.id, "missing test user");
  assert(otherUser?.id, "missing other user");

  const { error: profileError } = await service.from("profiles").insert([
    { id: user.id, username, nickname: "评论V2测试" },
    { id: otherUser.id, username: otherUsername, nickname: "他人" },
  ]);
  assert(!profileError, profileError?.message ?? "insert profiles failed");

  const olderCommentId = randomUUID();
  const newerCommentId = randomUUID();
  const hiddenCommentId = randomUUID();
  const otherCommentId = randomUUID();
  const now = Date.now();
  const publishedAt = new Date(now).toISOString();

  const baseComment = {
    post_id: publishedPost.id,
    author: "评论V2测试",
    moderation_status: "published" as const,
    risk_score: 0,
    risk_level: "low" as const,
    published_at: publishedAt,
    parent_id: null,
    reply_to_author: null,
    image_url: null,
    image_storage_path: null,
    moderation_note: null,
  };

  const { error: insertError } = await service.from("comments").insert([
    {
      ...baseComment,
      id: olderCommentId,
      user_id: user.id,
      content: "older profile comment",
      created_at: new Date(now - 60_000).toISOString(),
    },
    {
      ...baseComment,
      id: newerCommentId,
      user_id: user.id,
      content: "newer profile comment",
      created_at: new Date(now - 1_000).toISOString(),
    },
    {
      ...baseComment,
      id: hiddenCommentId,
      user_id: user.id,
      content: "hidden profile comment",
      moderation_status: "hidden",
      published_at: null,
    },
    {
      ...baseComment,
      id: otherCommentId,
      user_id: otherUser.id,
      content: "other user comment",
      created_at: publishedAt,
    },
  ]);
  assert(!insertError, insertError?.message ?? "insert comments failed");

  const userClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  assert(!signInError, signInError?.message ?? "sign in failed");

  const result = await fetchUserProfileComments({
    userId: user.id,
    client: userClient,
    limit: PROFILE_COMMENTS_PAGE_SIZE,
  });

  assert(result.entries.length === 2, `expected 2 comments, got ${result.entries.length}`);
  assert(
    result.entries.every((entry) => entry.comment.content !== "other user comment"),
    "should not include other user's comments",
  );
  assert(
    result.entries.every((entry) => entry.comment.content !== "hidden profile comment"),
    "should not include non-published comments",
  );
  assert(
    result.entries[0]?.comment.id === newerCommentId,
    "comments should be ordered by created_at DESC",
  );
  assert(
    result.entries[0]?.post?.id === publishedPost.id &&
      result.entries[0]?.post?.title === publishedPost.title,
    "post title should resolve for profile comments",
  );

  await service.from("comments").delete().in("id", [
    olderCommentId,
    newerCommentId,
    hiddenCommentId,
    otherCommentId,
  ]);
  await service.from("profiles").delete().in("id", [user.id, otherUser.id]);
  await service.auth.admin.deleteUser(user.id);
  await service.auth.admin.deleteUser(otherUser.id);

  console.log("PASS  profile-comments-v2 integration");
}

main().catch((error) => {
  console.error("FAIL  profile-comments-v2 integration:", error);
  process.exit(1);
});
