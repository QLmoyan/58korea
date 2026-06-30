"use client";

import Image from "next/image";
import type { InboxConversationItem } from "@/lib/messages/inbox-types";

interface MessageInboxItemProps {
  item: InboxConversationItem;
  onClick: () => void;
}

function formatUnreadBadge(count: number) {
  if (count <= 0) {
    return null;
  }

  return count > 99 ? "99+" : String(count);
}

export default function MessageInboxItem({
  item,
  onClick,
}: MessageInboxItemProps) {
  const badge = formatUnreadBadge(item.unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100 lg:px-6"
    >
      <div className="relative shrink-0">
        {item.avatarUrl ? (
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-100">
            <Image
              src={item.avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${
              item.avatarKind === "system"
                ? "bg-gradient-to-br from-sky-500 to-indigo-500"
                : "bg-gradient-to-br from-rose-400 to-orange-300"
            }`}
          >
            {item.avatarLabel.slice(0, 2)}
          </div>
        )}
        {item.unreadCount > 0 ? (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold text-zinc-900">
            {item.title}
          </h3>
          {item.time ? (
            <time className="shrink-0 text-xs text-zinc-400">{item.time}</time>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="truncate text-sm text-zinc-500">{item.summary}</p>
          {badge ? (
            <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
