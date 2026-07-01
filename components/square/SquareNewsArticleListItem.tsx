"use client";

import Image from "next/image";
import Link from "next/link";
import type { DiscoveryNewsArticleItem } from "@/lib/types/channel-articles";
import { formatChannelArticleDate } from "@/lib/channels/format";

interface SquareNewsArticleListItemProps {
  article: DiscoveryNewsArticleItem;
}

function ArticleThumbnailPlaceholder() {
  return <div className="h-full w-full bg-zinc-100" aria-hidden="true" />;
}

export default function SquareNewsArticleListItem({
  article,
}: SquareNewsArticleListItemProps) {
  const publishedLabel = formatChannelArticleDate(
    article.published_at ?? article.created_at,
  );

  return (
    <Link
      href={`/articles/${article.id}`}
      className="flex touch-manipulation items-start gap-3 px-4 py-2.5 active:bg-zinc-50/80 lg:px-0"
      data-testid="square-news-article-list-item"
    >
      <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-[88px] sm:w-[88px]">
        {article.cover_url ? (
          <Image
            src={article.cover_url}
            alt=""
            fill
            sizes="(max-width: 640px) 84px, 88px"
            className="object-cover"
          />
        ) : (
          <ArticleThumbnailPlaceholder />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-[18px] text-zinc-900 lg:text-sm lg:leading-5">
          {article.title}
        </h3>

        {article.summaryExcerpt ? (
          <p className="line-clamp-2 text-[11px] leading-[15px] text-zinc-500">
            {article.summaryExcerpt}
          </p>
        ) : null}

        <p className="line-clamp-1 pt-0.5 text-[10px] leading-[14px] text-zinc-400">
          频道新闻{publishedLabel ? ` · ${publishedLabel}` : ""}
        </p>
      </div>
    </Link>
  );
}
