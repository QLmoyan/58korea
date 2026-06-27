import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
import {
  notifyCommentReply,
  notifyPostComment,
  notifyPostLike,
} from "../lib/notifications/create-notification";
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
    .from("notifications")
    .select("id")
    .limit(1);
  assert(!tableError, `notifications table missing: ${tableError?.message}`);

  const stamp = Date.now();
  const password = "Test123456!";
  const ownerUsername = `ntf_o_${String(stamp).slice(-6)}`;
  const actorUsername = `ntf_a_${String(stamp).slice(-6)}`;
  const otherUsername = `ntf_x_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: ownerUsername,
    password,
    nickname: `通知作者${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: actorUsername,
    password,
    nickname: `通知操作${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: otherUsername,
    password,
    nickname: `通知路人${String(stamp).slice(-4)}`,
  });

  const ownerClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const actorClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const otherClient = createClient<Database>(url, anonKey, {
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

  await actorClient.auth.signInWithPassword({
    email: toInternalEmail(actorUsername),
    password,
  });
  const {
    data: { user: actorUser },
  } = await actorClient.auth.getUser();
  assert(actorUser?.id, "missing actor user");

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
    .insert({
      title: `通知测试帖${String(stamp).slice(-4)}`,
      content: "notification test post",
      author: `通知作者${String(stamp).slice(-4)}`,
      author_id: ownerUser.id,
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id, title")
    .single();
  assert(!postError && post?.id, postError?.message ?? "failed to create post");

  const commentId = crypto.randomUUID();
  const { error: commentError } = await service.from("comments").insert({
    id: commentId,
    post_id: post.id,
    author: `通知操作${String(stamp).slice(-4)}`,
    content: "这是一条测试评论",
    user_id: actorUser.id,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(!commentError, commentError?.message ?? "failed to create comment");

  await notifyPostComment({
    postAuthorId: ownerUser.id,
    actorId: actorUser.id,
    actorName: `通知操作${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle: post.title,
    commentId,
    commentContent: "这是一条测试评论",
  });

  await notifyPostLike({
    postAuthorId: ownerUser.id,
    actorId: actorUser.id,
    actorName: `通知操作${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle: post.title,
  });

  await notifyPostComment({
    postAuthorId: ownerUser.id,
    actorId: ownerUser.id,
    actorName: `通知作者${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle: post.title,
    commentId,
    commentContent: "自己评论不应生成通知",
  });

  await notifyPostLike({
    postAuthorId: ownerUser.id,
    actorId: ownerUser.id,
    actorName: `通知作者${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle: post.title,
  });

  const { data: ownerNotifications, error: ownerReadError } = await ownerClient
    .from("notifications")
    .select("id, type, is_read")
    .eq("user_id", ownerUser.id)
    .order("created_at", { ascending: false });
  assert(!ownerReadError, ownerReadError?.message ?? "owner read failed");
  assert((ownerNotifications ?? []).length >= 2, "owner should have notifications");

  const { error: anonInsertError } = await otherClient.from("notifications").insert({
    user_id: ownerUser.id,
    actor_id: actorUser.id,
    type: "comment",
    post_id: post.id,
    title: "伪造通知",
    body: "不应成功",
  });
  assert(anonInsertError, "authenticated user should not insert notifications directly");

  const selfNotifications = (ownerNotifications ?? []).filter(
    (row) => row.type === "comment" || row.type === "like",
  );
  assert(selfNotifications.length >= 2, "expected comment and like notifications");

  const { data: otherNotifications, error: otherReadError } = await otherClient
    .from("notifications")
    .select("id")
    .eq("user_id", ownerUser.id);
  assert(!otherReadError, otherReadError?.message ?? "other read query failed");
  assert((otherNotifications ?? []).length === 0, "other user should not read owner notifications");

  const target = ownerNotifications?.[0];
  assert(target?.id, "missing notification to mark read");

  const { error: otherMarkError } = await otherClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", target.id)
    .eq("user_id", ownerUser.id);

  const { data: afterOtherMark } = await service
    .from("notifications")
    .select("is_read")
    .eq("id", target.id)
    .single();
  assert(
    afterOtherMark?.is_read === false,
    "other user should not mark owner notification read",
  );
  void otherMarkError;

  const { error: ownerMarkError } = await ownerClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", target.id)
    .eq("user_id", ownerUser.id);
  assert(!ownerMarkError, ownerMarkError?.message ?? "owner mark read failed");

  const parentCommentId = crypto.randomUUID();
  const { error: parentCommentError } = await service.from("comments").insert({
    id: parentCommentId,
    post_id: post.id,
    author: `通知作者${String(stamp).slice(-4)}`,
    content: "父评论",
    user_id: ownerUser.id,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(!parentCommentError, parentCommentError?.message ?? "parent comment failed");

  const replyCommentId = crypto.randomUUID();
  const { error: replyCommentError } = await service.from("comments").insert({
    id: replyCommentId,
    post_id: post.id,
    author: `通知操作${String(stamp).slice(-4)}`,
    content: "这是一条回复",
    user_id: actorUser.id,
    parent_id: parentCommentId,
    reply_to_author: `通知作者${String(stamp).slice(-4)}`,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(!replyCommentError, replyCommentError?.message ?? "reply comment failed");

  await notifyCommentReply({
    parentAuthorId: ownerUser.id,
    actorId: actorUser.id,
    actorName: `通知操作${String(stamp).slice(-4)}`,
    postId: post.id,
    commentId: replyCommentId,
    commentContent: "这是一条回复",
    replyToAuthor: `通知作者${String(stamp).slice(-4)}`,
  });

  const { data: replyNotifications } = await ownerClient
    .from("notifications")
    .select("id, type")
    .eq("user_id", ownerUser.id)
    .eq("type", "reply");
  assert((replyNotifications ?? []).length >= 1, "reply notification missing");

  await service.from("notifications").delete().eq("user_id", ownerUser.id);
  await service.from("comments").delete().eq("post_id", post.id);
  await service.from("posts").delete().eq("id", post.id);

  console.log("Notifications V1 checks passed:");
  console.log(`- owner: ${ownerUsername}`);
  console.log(`- actor: ${actorUsername}`);
  console.log(`- post id: ${post.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
