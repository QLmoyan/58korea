import Link from "next/link";
import type { ChannelWithArticles } from "@/lib/types/channel-articles";
import { formatChannelArticleDate } from "@/lib/channels/format";

interface ChannelModuleCardProps {
  channel: ChannelWithArticles;
}

export default function ChannelModuleCard({ channel }: ChannelModuleCardProps) {
  return (
    <section className="border-b border-zinc-100/40 px-3 py-5 last:border-b-0 lg:px-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/channels/${channel.slug}`}
            className="text-base font-semibold text-zinc-900 hover:text-rose-500"
          >
            {channel.name}
          </Link>
          {channel.description ? (
            <p className="mt-1 text-sm leading-6 text-zinc-500">{channel.description}</p>
          ) : null}
        </div>
        <Link
          href={`/channels/${channel.slug}`}
          className="shrink-0 text-xs font-medium text-rose-500"
        >
          进入频道
        </Link>
      </div>

      {channel.recentArticles.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {channel.recentArticles.map((article) => (
            <li key={article.id}>
              <Link
                href={`/articles/${article.id}`}
                className="block rounded-xl px-1 py-1 hover:bg-zinc-50"
              >
                <p className="line-clamp-2 text-sm font-medium leading-6 text-zinc-800">
                  {article.title}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {formatChannelArticleDate(article.published_at ?? article.created_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">暂无文章</p>
      )}
    </section>
  );
}
