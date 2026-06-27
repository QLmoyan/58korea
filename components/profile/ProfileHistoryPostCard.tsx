"use client";

import Image from "next/image";
import Link from "next/link";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import PostAuthorLink from "@/components/posts/PostAuthorLink";
import type { Post } from "@/lib/data/posts";
import { usePostAuthorContext } from "@/lib/merchant/use-post-merchant";
import {
  getPostContentPreview,
  getPostCoverUrl,
  getPostTitle,
  hasPostCover,
} from "@/lib/posts/profile-post-preview";
import { usePostStore } from "@/lib/store/post-store";

interface ProfileHistoryPostCardProps {
  post: Post;
}

const cardLinkClassName =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100/90 bg-white shadow-sm transition-transform active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:border-zinc-200 lg:hover:shadow-md";

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export default function ProfileHistoryPostCard({
  post,
}: ProfileHistoryPostCardProps) {
  const withCover = hasPostCover(post);
  const coverUrl = getPostCoverUrl(post);
  const title = getPostTitle(post);
  const contentPreview = getPostContentPreview(post);
  const { isMerchant: merchantPost, authorHomeHref } = usePostAuthorContext({
    author: post.author,
    authorId: post.authorId,
    authorUsername: post.authorUsername,
  });
  const { isPostFavorited } = usePostStore();
  const favorited = isPostFavorited(post.id);

  if (withCover && coverUrl) {
    return (
      <Link href={`/posts/${post.id}`} className={cardLinkClassName}>
        <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-zinc-50">
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 50vw, 25vw"
          />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-zinc-900">
            {title}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-2">
            <PostAuthorLink
              author={post.author}
              href={authorHomeHref}
              className="min-w-0 flex-1"
              avatarClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white"
              nameClassName="truncate text-[11px] text-zinc-500"
            >
              {merchantPost ? <MerchantVerifiedBadge size="sm" /> : null}
            </PostAuthorLink>

            <div className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <HeartIcon />
                {formatCount(post.likes)}
              </span>
              {favorited ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <StarIcon filled />
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/posts/${post.id}`} className={cardLinkClassName}>
      <div className="flex min-h-[8rem] flex-1 flex-col p-3 sm:min-h-[9rem] sm:p-3.5">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-zinc-900">
          {title}
        </h3>

        {contentPreview ? (
          <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-zinc-600 sm:line-clamp-4">
            {contentPreview}
          </p>
        ) : (
          <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-zinc-400 sm:line-clamp-4">
            暂无正文
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <PostAuthorLink
            author={post.author}
            href={authorHomeHref}
            className="min-w-0 flex-1"
            avatarClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white"
            nameClassName="truncate text-[11px] text-zinc-500"
          >
            {merchantPost ? <MerchantVerifiedBadge size="sm" /> : null}
          </PostAuthorLink>

          <div className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <HeartIcon />
              {formatCount(post.likes)}
            </span>
            {favorited ? (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <StarIcon filled />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
      />
    </svg>
  );
}
