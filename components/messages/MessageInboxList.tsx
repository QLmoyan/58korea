"use client";

import MessageInboxItem from "@/components/messages/MessageInboxItem";
import type { InboxConversationItem } from "@/lib/messages/inbox-types";

interface MessageInboxListProps {
  items: InboxConversationItem[];
  onSelect: (id: InboxConversationItem["id"]) => void;
}

export default function MessageInboxList({
  items,
  onSelect,
}: MessageInboxListProps) {
  return (
    <div className="divide-y divide-zinc-100" data-testid="message-inbox-list">
      {items.map((item) => (
        <MessageInboxItem
          key={item.id}
          item={item}
          onClick={() => onSelect(item.id)}
        />
      ))}
    </div>
  );
}
