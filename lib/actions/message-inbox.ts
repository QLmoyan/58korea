"use server";

import { fetchChatInboxAction } from "@/lib/actions/chat";
import {
  buildInboxConversations,
  type InboxActorProfile,
} from "@/lib/messages/build-inbox";
import { mergeInboxItems } from "@/lib/messages/merge-inbox";
import type { UnifiedInboxItem } from "@/lib/messages/inbox-types";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

export async function fetchUnifiedInboxAction(): Promise<UnifiedInboxItem[]> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, is_read, actor_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => row.actor_id)
        .filter((actorId): actorId is string => typeof actorId === "string"),
    ),
  );

  const actorProfiles = new Map<string, InboxActorProfile>();
  if (actorIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .in("id", actorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      actorProfiles.set(profile.id, {
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
      });
    }
  }

  const notificationItems = buildInboxConversations(rows, actorProfiles);
  const chatItems = await fetchChatInboxAction();

  return mergeInboxItems(chatItems, notificationItems);
}

/** @deprecated Use fetchUnifiedInboxAction */
export async function fetchMessageInboxAction() {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const items = await fetchUnifiedInboxAction();
  return items.filter((item) => item.kind === "notification");
}
