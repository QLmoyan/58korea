import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type NotificationType = Database["public"]["Tables"]["notifications"]["Row"]["type"];

interface CreateNotificationInput {
  userId: string;
  actorId: string | null;
  type: NotificationType;
  postId?: number | null;
  commentId?: string | null;
  title: string;
  body: string;
}

export async function createNotification(input: CreateNotificationInput) {
  if (!input.userId) {
    return;
  }

  if (input.actorId && input.actorId === input.userId) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    actor_id: input.actorId,
    type: input.type,
    post_id: input.postId ?? null,
    comment_id: input.commentId ?? null,
    title: input.title,
    body: input.body,
    is_read: false,
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}

function trimBody(content: string, maxLength = 80) {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}…`;
}

export async function notifyPostComment(input: {
  postAuthorId: string | null | undefined;
  actorId: string | null | undefined;
  actorName: string;
  postId: number;
  postTitle: string;
  commentId: string;
  commentContent: string;
}) {
  if (!input.postAuthorId || !input.actorId) {
    return;
  }

  await createNotification({
    userId: input.postAuthorId,
    actorId: input.actorId,
    type: "comment",
    postId: input.postId,
    commentId: input.commentId,
    title: "有人评论了你的帖子",
    body: `${input.actorName}：${trimBody(input.commentContent)}`,
  });
}

export async function notifyCommentReply(input: {
  parentAuthorId: string | null | undefined;
  actorId: string | null | undefined;
  actorName: string;
  postId: number;
  commentId: string;
  commentContent: string;
  replyToAuthor: string | null;
}) {
  if (!input.parentAuthorId || !input.actorId) {
    return;
  }

  await createNotification({
    userId: input.parentAuthorId,
    actorId: input.actorId,
    type: "reply",
    postId: input.postId,
    commentId: input.commentId,
    title: "有人回复了你",
    body: input.replyToAuthor
      ? `${input.actorName} 回复了你：${trimBody(input.commentContent)}`
      : `${input.actorName}：${trimBody(input.commentContent)}`,
  });
}

export async function notifyPostLike(input: {
  postAuthorId: string | null | undefined;
  actorId: string;
  actorName: string;
  postId: number;
  postTitle: string;
}) {
  if (!input.postAuthorId) {
    return;
  }

  await createNotification({
    userId: input.postAuthorId,
    actorId: input.actorId,
    type: "like",
    postId: input.postId,
    title: "有人点赞了你的帖子",
    body: `${input.actorName} 赞了你的帖子「${trimBody(input.postTitle, 40)}」`,
  });
}

export async function notifySystemMessage(input: {
  userId: string;
  title: string;
  body: string;
}) {
  if (!input.userId) {
    return;
  }

  await createNotification({
    userId: input.userId,
    actorId: null,
    type: "system",
    postId: null,
    title: input.title,
    body: input.body,
  });
}
