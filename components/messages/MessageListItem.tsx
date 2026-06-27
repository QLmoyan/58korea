"use client";

import Image from "next/image";
import Link from "next/link";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import type { MessageItem } from "@/lib/messages/types";

interface MessageListItemProps {
  item: MessageItem;
  onRead?: (id: string) => void;
}

export default function MessageListItem({ item, onRead }: MessageListItemProps) {
  async function handleClick() {
    if (item.isRead) {
      return;
    }

    try {
      await markNotificationReadAction(item.id);
      onRead?.(item.id);
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  }

  return (
    <Link
      href={`/posts/${item.postId}`}
      onClick={handleClick}
      className={`flex items-start gap-3 py-4 transition-colors ${
        item.isRead ? "opacity-80" : "bg-rose-50/40"
      }`}
    >
      <div className="relative shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white">
          {item.avatarLabel.slice(0, 2)}
        </div>
        {!item.isRead ? (
          <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
          <time className="shrink-0 text-[11px] text-zinc-400">{item.time}</time>
        </div>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
          {item.content}
        </p>
      </div>

      {item.thumbnailUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-100">
          <Image
            src={item.thumbnailUrl}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
      ) : null}
    </Link>
  );
}
