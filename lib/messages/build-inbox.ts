import {
  INBOX_EMPTY_SUMMARIES,
  INBOX_DETAIL_TITLES,
} from "@/lib/messages/inbox-constants";
import { formatRelativeMessageTime } from "@/lib/messages/format-time";
import type { InboxConversationItem, InboxDetailId } from "@/lib/messages/inbox-types";

export interface InboxNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
  actor_id: string | null;
}

export interface InboxActorProfile {
  nickname: string;
  avatar_url: string | null;
}

const INBOX_TYPES: Record<InboxDetailId, string[]> = {
  system: ["system"],
  interaction: ["comment", "reply"],
  like: ["like"],
};

const INBOX_ORDER: InboxDetailId[] = ["system", "interaction", "like"];

function getAvatarLabelFromBody(body: string, actorId: string | null) {
  const match = body.match(/^([^：:]+)[：:]/);
  if (match?.[1]) {
    return match[1].trim().slice(0, 2);
  }

  return actorId ? "用户" : "韩";
}

export function buildInboxConversations(
  rows: InboxNotificationRow[],
  actorProfiles: Map<string, InboxActorProfile>,
): InboxConversationItem[] {
  return INBOX_ORDER.map((id) => {
    const types = INBOX_TYPES[id];
    const categoryRows = rows.filter((row) => types.includes(row.type));
    const unreadCount = categoryRows.filter((row) => !row.is_read).length;
    const latest = categoryRows
      .slice()
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      )[0];

    let avatarUrl: string | null = null;
    let avatarLabel = id === "system" ? "韩圈" : "互";
    const avatarKind = id === "system" ? "system" : "user";

    if (latest && avatarKind === "user" && latest.actor_id) {
      const profile = actorProfiles.get(latest.actor_id);
      if (profile) {
        avatarLabel = profile.nickname.slice(0, 2) || "用户";
        avatarUrl = profile.avatar_url;
      } else {
        avatarLabel = getAvatarLabelFromBody(latest.body, latest.actor_id);
      }
    }

    const summary = latest
      ? latest.body || latest.title
      : INBOX_EMPTY_SUMMARIES[id];
    const time = latest ? formatRelativeMessageTime(latest.created_at) : "";

    return {
      id,
      title: INBOX_DETAIL_TITLES[id],
      summary,
      time,
      unreadCount,
      avatarLabel,
      avatarUrl,
      avatarKind,
    };
  });
}
