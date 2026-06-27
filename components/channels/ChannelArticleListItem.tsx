import Image from "next/image";
import Link from "next/link";
import type { ChannelArticleSummary } from "@/lib/types/channel-articles";
import { formatChannelArticleDate } from "@/lib/channels/format";

interface ChannelArticleListItemProps {
  article: ChannelArticleSummary;
}

export default function ChannelArticleListItem({
  article,
}: ChannelArticleListItemProps) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex gap-3 border-b border-zinc-100/40 py-4 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 text-base font-semibold leading-6 text-zinc-900">
          {article.title}
        </h2>
        <p className="mt-2 text-xs text-zinc-400">
          {formatChannelArticleDate(article.published_at ?? article.created_at)}
        </p>
      </div>

      {article.cover_url ? (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          <Image
            src={article.cover_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
      ) : null}
    </Link>
  );
}
