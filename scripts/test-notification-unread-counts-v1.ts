import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
import {
  buildNotificationUnreadCounts,
} from "../lib/messages/unread-counts";
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

async function fetchUnreadRows(
  client: ReturnType<typeof createClient<Database>>,
  userId: string,
) {
  const { data, error } = await client
    .from("notifications")
    .select("type")
    .eq("user_id", userId)
    .eq("is_read", false);

  assert(!error, error?.message ?? "failed to fetch unread notifications");
  return buildNotificationUnreadCounts(data ?? []);
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

  const stamp = Date.now();
  const password = "Test123456!";
  const ownerUsername = `unread_o_${String(stamp).slice(-6)}`;
  const actorUsername = `unread_a_${String(stamp).slice(-6)}`;
  const otherUsername = `unread_x_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: ownerUsername,
    password,
    nickname: `未读作者${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: actorUsername,
    password,
    nickname: `未读操作${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: otherUsername,
    password,
    nickname: `未读路人${String(stamp).slice(-4)}`,
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

  const postTitle = `未读测试帖${String(stamp).slice(-4)}`;
  const { data: post, error: postError } = await service
    .from("posts")
    .insert({
      title: postTitle,
      content: "notification unread count test",
      author: `未读作者${String(stamp).slice(-4)}`,
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
    .select("id")
    .single();
  assert(!postError && post?.id, postError?.message ?? "failed to create post");

  const commentId = crypto.randomUUID();
  const { error: commentError } = await service.from("comments").insert({
    id: commentId,
    post_id: post.id,
    author: `未读操作${String(stamp).slice(-4)}`,
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
    actorName: `未读操作${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle,
    commentId,
    commentContent: "这是一条测试评论",
  });

  await notifyPostLike({
    postAuthorId: ownerUser.id,
    actorId: actorUser.id,
    actorName: `未读操作${String(stamp).slice(-4)}`,
    postId: post.id,
    postTitle,
  });

  const parentCommentId = crypto.randomUUID();
  const { error: parentCommentError } = await service.from("comments").insert({
    id: parentCommentId,
    post_id: post.id,
    author: `未读作者${String(stamp).slice(-4)}`,
    content: "父评论",
    user_id: ownerUser.id,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(
    !parentCommentError,
    parentCommentError?.message ?? "failed to create parent comment",
  );

  const replyCommentId = crypto.randomUUID();
  const { error: replyCommentError } = await service.from("comments").insert({
    id: replyCommentId,
    post_id: post.id,
    author: `未读操作${String(stamp).slice(-4)}`,
    content: "这是一条回复",
    user_id: actorUser.id,
    parent_id: parentCommentId,
    reply_to_author: `未读作者${String(stamp).slice(-4)}`,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });
  assert(!replyCommentError, replyCommentError?.message ?? "failed to create reply comment");

  await notifyCommentReply({
    parentAuthorId: ownerUser.id,
    actorId: actorUser.id,
    actorName: `未读操作${String(stamp).slice(-4)}`,
    postId: post.id,
    commentId: replyCommentId,
    commentContent: "这是一条回复",
    replyToAuthor: `未读作者${String(stamp).slice(-4)}`,
  });

  console.log("1) user can only count own unread notifications");
  const ownerCounts = await fetchUnreadRows(ownerClient, ownerUser.id);
  const otherCounts = await fetchUnreadRows(otherClient, otherUser.id);
  assert(ownerCounts.totalUnread >= 3, "owner should have unread notifications");
  assert(otherCounts.totalUnread === 0, "other user should have zero unread");
  console.log("   PASS");

  console.log("2) comment/reply/like unread counts are separated");
  assert(ownerCounts.commentUnread >= 1, "comment unread missing");
  assert(ownerCounts.replyUnread >= 1, "reply unread missing");
  assert(ownerCounts.likeUnread >= 1, "like unread missing");
  assert(
    ownerCounts.totalUnread ===
      ownerCounts.commentUnread +
        ownerCounts.replyUnread +
        ownerCounts.likeUnread +
        ownerCounts.systemUnread,
    "totalUnread should equal per-type sum",
  );
  console.log("   PASS");

  console.log("3) marking one notification read reduces counts");
  const { data: unreadComment } = await ownerClient
    .from("notifications")
    .select("id")
    .eq("user_id", ownerUser.id)
    .eq("type", "comment")
    .eq("is_read", false)
    .limit(1)
    .maybeSingle();
  assert(unreadComment?.id, "missing unread comment notification");

  const beforeSingle = ownerCounts.totalUnread;
  const { error: markOneError } = await ownerClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", unreadComment.id)
    .eq("user_id", ownerUser.id);
  assert(!markOneError, markOneError?.message ?? "failed to mark one read");

  const afterSingle = await fetchUnreadRows(ownerClient, ownerUser.id);
  assert(
    afterSingle.totalUnread === beforeSingle - 1,
    "total unread should decrease by 1",
  );
  assert(
    afterSingle.commentUnread === ownerCounts.commentUnread - 1,
    "comment unread should decrease by 1",
  );
  console.log("   PASS");

  console.log("4) mark all read clears tab counts");
  const { error: markAllError } = await ownerClient
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", ownerUser.id)
    .eq("is_read", false);
  assert(!markAllError, markAllError?.message ?? "failed to mark all read");

  const afterAll = await fetchUnreadRows(ownerClient, ownerUser.id);
  assert(
    afterAll.totalUnread === 0 &&
      afterAll.commentUnread === 0 &&
      afterAll.replyUnread === 0 &&
      afterAll.likeUnread === 0 &&
      afterAll.systemUnread === 0,
    "all unread counts should be zero",
  );
  console.log("   PASS");

  console.log("5) bottom nav uses real totalUnread");
  const bottomNavSource = readFileSync(
    resolve(process.cwd(), "components/home/BottomNav.tsx"),
    "utf8",
  );
  assert(
    bottomNavSource.includes("useNotificationUnreadCounts"),
    "BottomNav should use unread counts hook",
  );
  assert(
    bottomNavSource.includes("counts.totalUnread > 0"),
    "BottomNav should show dot from totalUnread",
  );
  assert(
    !bottomNavSource.includes("SHOW_MESSAGE_UNREAD_DOT"),
    "BottomNav should not use placeholder unread flag",
  );
  console.log("   PASS");

  await service.from("notifications").delete().eq("user_id", ownerUser.id);
  await service.from("comments").delete().eq("post_id", post.id);
  await service.from("posts").delete().eq("id", post.id);

  console.log("\nAll notification unread count V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
