"use client";

import MessageInboxItem from "@/components/messages/MessageInboxItem";
import type {
  InboxDetailId,
  UnifiedInboxItem,
} from "@/lib/messages/inbox-types";

interface MessageInboxListProps {
  items: UnifiedInboxItem[];
  onNotificationSelect: (id: InboxDetailId) => void;
  onChatSelect: (
    conversationId: string,
    peer?: { title: string; avatarUrl: string | null; avatarLabel: string },
  ) => void;
}

export default function MessageInboxList({
  items,
  onNotificationSelect,
  onChatSelect,
}: MessageInboxListProps) {
  return (
    <div className="divide-y divide-zinc-100" data-testid="message-inbox-list">
      {items.map((item) => {
        const key =
          item.kind === "chat"
            ? `chat-${item.conversationId}`
            : `notification-${item.id}`;

        return (
          <MessageInboxItem
            key={key}
            item={item}
            onClick={() => {
              if (item.kind === "chat") {
                onChatSelect(item.conversationId, {
                  title: item.title,
                  avatarUrl: item.avatarUrl,
                  avatarLabel: item.avatarLabel,
                });
                return;
              }

              onNotificationSelect(item.id);
            }}
          />
        );
      })}
    </div>
  );
}
