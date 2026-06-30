import type { ChatInboxItem } from "@/lib/chat/types";
import type {
  InboxConversationItem,
  UnifiedInboxItem,
} from "@/lib/messages/inbox-types";

export function mergeInboxItems(
  chatItems: ChatInboxItem[],
  notificationItems: InboxConversationItem[],
): UnifiedInboxItem[] {
  const chats: UnifiedInboxItem[] = chatItems.map((item) => ({
    kind: "chat",
    ...item,
  }));

  const notifications: UnifiedInboxItem[] = notificationItems.map((item) => ({
    kind: "notification",
    ...item,
  }));

  return [...chats, ...notifications];
}
