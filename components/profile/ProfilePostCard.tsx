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

interface ProfilePostCardProps {
  post: Post;
  showAuthor?: boolean;
}

const cardLinkClassName =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-100/90 bg-white/95 shadow-sm transition-transform active:scale-[0.98] lg:hover:-translate-y-0.5 lg:hover:border-zinc-200 lg:hover:shadow-md";

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(value);
}

export default function ProfilePostCard({
  post,
  showAuthor = false,
}: ProfilePostCardProps) {
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
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-50">
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 50vw, 25vw"
          />
        </div>

        <ProfilePostCardMeta
          title={title}
          showAuthor={showAuthor}
          post={post}
          merchantPost={merchantPost}
          authorHomeHref={authorHomeHref}
          likes={post.likes}
          favorited={favorited}
        />
      </Link>
    );
  }

  return (
    <Link href={`/posts/${post.id}`} className={cardLinkClassName}>
      <div className="flex min-h-[7.5rem] flex-1 flex-col p-3 sm:min-h-[8.5rem] sm:p-3.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-900">
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

        <div className="mt-auto pt-3">
          <ProfilePostCardFooter
            showAuthor={showAuthor}
            post={post}
            merchantPost={merchantPost}
            authorHomeHref={authorHomeHref}
            likes={post.likes}
            favorited={favorited}
          />
        </div>
      </div>
    </Link>
  );
}

function ProfilePostCardMeta({
  title,
  showAuthor,
  post,
  merchantPost,
  authorHomeHref,
  likes,
  favorited,
}: {
  title: string;
  showAuthor: boolean;
  post: Post;
  merchantPost: boolean;
  authorHomeHref: string | null;
  likes: number;
  favorited: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col space-y-2 p-2.5">
      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-900">
        {title}
      </h3>

      <ProfilePostCardFooter
        showAuthor={showAuthor}
        post={post}
        merchantPost={merchantPost}
        authorHomeHref={authorHomeHref}
        likes={likes}
        favorited={favorited}
      />
    </div>
  );
}

function ProfilePostCardFooter({
  showAuthor,
  post,
  merchantPost,
  authorHomeHref,
  likes,
  favorited,
}: {
  showAuthor: boolean;
  post: Post;
  merchantPost: boolean;
  authorHomeHref: string | null;
  likes: number;
  favorited: boolean;
}) {
  return (
    <>
      {showAuthor ? (
        <PostAuthorLink
          author={post.author}
          href={authorHomeHref}
          className="min-w-0"
          avatarClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white"
          nameClassName="truncate text-[11px] text-zinc-500"
        >
          {merchantPost ? <MerchantVerifiedBadge size="sm" /> : null}
        </PostAuthorLink>
      ) : null}

      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <HeartIcon />
          {formatCount(likes)}
        </span>
        {favorited ? (
          <span className="inline-flex items-center gap-1 text-amber-500">
            <StarIcon filled />
            已收藏
          </span>
        ) : null}
      </div>
    </>
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
