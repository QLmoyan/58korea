import Image from "next/image";
import Link from "next/link";
import MarkdownContent from "@/components/channels/MarkdownContent";
import type { ChannelArticleDetail } from "@/lib/types/channel-articles";
import { formatChannelArticleDate } from "@/lib/channels/format";

interface ArticleDetailViewProps {
  article: ChannelArticleDetail;
}

export default function ArticleDetailView({ article }: ArticleDetailViewProps) {
  const authorLabel = article.author?.nickname ?? "58韩国";
  const authorHref = article.author?.username
    ? `/profile/${article.author.username}`
    : null;
  const publishedLabel = formatChannelArticleDate(
    article.published_at ?? article.created_at,
  );

  return (
    <article className="bg-white">
      <div className="border-b border-zinc-100/40 px-4 py-4 lg:px-0">
        <Link
          href={`/channels/${article.channel.slug}`}
          className="text-xs font-medium text-rose-500"
        >
          {article.channel.name}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold leading-8 text-zinc-900">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          {authorHref ? (
            <Link href={authorHref} className="hover:text-rose-500">
              {authorLabel}
            </Link>
          ) : (
            <span>{authorLabel}</span>
          )}
          {publishedLabel ? <span>{publishedLabel}</span> : null}
        </div>
      </div>

      {article.cover_url ? (
        <div className="relative aspect-[16/9] max-h-[280px] w-full overflow-hidden bg-zinc-100">
          <Image
            src={article.cover_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 720px"
          />
        </div>
      ) : null}

      <div className="px-4 py-6 lg:px-0">
        <MarkdownContent content={article.content_markdown} />
      </div>
    </article>
  );
}
