import type { MessageItem } from "@/lib/messages/types";

interface MessageListItemProps {
  item: MessageItem;
}

export default function MessageListItem({ item }: MessageListItemProps) {
  return (
    <article className="flex items-start gap-3 py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white">
        {item.avatarLabel.slice(0, 2)}
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

      {item.hasThumbnail ? (
        <div
          className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 ring-1 ring-zinc-100"
          aria-hidden="true"
        />
      ) : null}
    </article>
  );
}
