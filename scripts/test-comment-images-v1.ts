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

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tableCheck, error: tableError } = await service
    .from("comment_images")
    .select("id")
    .limit(1);
  assert(!tableError, `comment_images table missing: ${tableError?.message}`);

  const stamp = Date.now();
  const password = "Test123456!";
  const ownerUsername = `cimg_o_${String(stamp).slice(-6)}`;
  const otherUsername = `cimg_x_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: ownerUsername,
    password,
    nickname: `评论图主${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: otherUsername,
    password,
    nickname: `评论图客${String(stamp).slice(-4)}`,
  });

  const ownerClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const otherClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ownerClient.auth.signInWithPassword({
    email: toInternalEmail(ownerUsername),
    password,
  });
  const {
    data: { user: ownerUser },
  } = await ownerClient.auth.getUser();
  assert(ownerUser?.id, "missing owner user");

  await otherClient.auth.signInWithPassword({
    email: toInternalEmail(otherUsername),
    password,
  });
  const {
    data: { user: otherUser },
  } = await otherClient.auth.getUser();
  assert(otherUser?.id, "missing other user");

  const { data: post, error: postError } = await service
    .from("posts")
    .select("id")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  assert(!postError && post?.id, postError?.message ?? "no published post");

  const commentId = crypto.randomUUID();
  const { error: commentInsertError } = await service.from("comments").insert({
    id: commentId,
    post_id: post.id,
    author: "评论图测试",
    content: "comment images v1 test",
    user_id: ownerUser.id,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(!commentInsertError, commentInsertError?.message ?? "failed to create comment");

  const imageUrl = `https://example.test/comment-images/${ownerUser.id}/${commentId}/demo.jpg`;

  const { error: anonInsertError } = await anonClient.from("comment_images").insert({
    comment_id: commentId,
    image_url: imageUrl,
    sort_order: 0,
  });
  assert(anonInsertError, "anon should not insert comment_images");

  const { error: otherInsertError } = await otherClient.from("comment_images").insert({
    comment_id: commentId,
    image_url: imageUrl,
    sort_order: 0,
  });
  assert(otherInsertError, "other user should not insert into foreign comment");

  const { data: ownImage, error: ownInsertError } = await ownerClient
    .from("comment_images")
    .insert({
      comment_id: commentId,
      image_url: imageUrl,
      sort_order: 0,
    })
    .select("id")
    .single();
  assert(!ownInsertError && ownImage?.id, ownInsertError?.message ?? "owner insert failed");

  const { data: readableImages, error: readError } = await anonClient
    .from("comment_images")
    .select("id, image_url")
    .eq("comment_id", commentId);
  assert(!readError, readError?.message ?? "anon read failed");
  assert((readableImages ?? []).length >= 1, "comment_images should be publicly readable");

  const { error: deleteCommentError } = await service
    .from("comments")
    .delete()
    .eq("id", commentId);
  assert(!deleteCommentError, deleteCommentError?.message ?? "delete comment failed");

  const { data: afterDelete, error: afterDeleteError } = await service
    .from("comment_images")
    .select("id")
    .eq("comment_id", commentId);
  assert(!afterDeleteError, afterDeleteError?.message ?? "read after delete failed");
  assert((afterDelete ?? []).length === 0, "comment_images should cascade delete");

  console.log("Comment images V1 checks passed:");
  console.log(`- owner: ${ownerUsername}`);
  console.log(`- comment id: ${commentId}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
