"use server";

import { formatRelativeMessageTime } from "@/lib/messages/format-time";
import type { MessageItem, MessageTabId } from "@/lib/messages/types";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type DbNotification = Database["public"]["Tables"]["notifications"]["Row"];

const TAB_TYPES: Record<MessageTabId, DbNotification["type"][] | null> = {
  comment: ["comment"],
  reply: ["reply"],
  like: ["like"],
  system: null,
};

function getAvatarLabel(body: string, actorId: string | null) {
  const match = body.match(/^([^：:]+)[：:]/);
  if (match?.[1]) {
    return match[1].trim().slice(0, 2);
  }

  return actorId ? "用户" : "58";
}

function mapNotification(row: DbNotification): MessageItem | null {
  if (!row.post_id) {
    return null;
  }

  const tab = row.type as MessageTabId;
  if (tab !== "comment" && tab !== "reply" && tab !== "like") {
    return null;
  }

  return {
    id: row.id,
    tab,
    title: row.title,
    content: row.body,
    time: formatRelativeMessageTime(row.created_at),
    avatarLabel: getAvatarLabel(row.body, row.actor_id),
    postId: row.post_id,
    isRead: row.is_read,
    thumbnailUrl: null,
  };
}

export async function fetchNotificationsByTabAction(
  tab: MessageTabId,
): Promise<MessageItem[]> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const types = TAB_TYPES[tab];
  if (!types) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .in("type", types)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const postIds = Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.post_id)
        .filter((postId): postId is number => typeof postId === "number"),
    ),
  );

  const thumbnailByPostId = new Map<number, string | null>();
  if (postIds.length > 0) {
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, image_url, post_images(public_url, sort_order)")
      .in("id", postIds);

    if (postsError) {
      throw new Error(postsError.message);
    }

    for (const post of posts ?? []) {
      const images = post.post_images ?? [];
      const sorted = images
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);
      thumbnailByPostId.set(
        post.id,
        post.image_url ?? sorted[0]?.public_url ?? null,
      );
    }
  }

  const items: MessageItem[] = [];

  for (const row of data ?? []) {
    const item = mapNotification(row);
    if (!item) {
      continue;
    }

    items.push({
      ...item,
      thumbnailUrl: thumbnailByPostId.get(item.postId) ?? null,
    });
  }

  return items;
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markAllNotificationsReadAction(tab: MessageTabId) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const types = TAB_TYPES[tab];
  if (!types) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .in("type", types);

  if (error) {
    throw new Error(error.message);
  }
}
