"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MerchantTitleStar from "@/components/merchant/MerchantTitleStar";
import PostAuthorLink from "@/components/posts/PostAuthorLink";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import SearchHighlightText from "@/components/search/SearchHighlightText";
import type { Post } from "@/lib/data/posts";
import { buildFavoriteLoginHref } from "@/lib/engagement/pending-favorite";
import { formatCouponAmountKrw } from "@/lib/merchant/coupon-utils";
import { usePostAuthorContext } from "@/lib/merchant/use-post-merchant";
import { useAuthStore } from "@/lib/store/auth-store";
import { useDesktopPostModalOptional } from "@/lib/store/desktop-post-modal-store";
import { usePostStore } from "@/lib/store/post-store";

interface PostCardProps {
  post: Post;
  highlightQuery?: string;
}

function formatLikes(likes: number) {
  if (likes >= 1000) {
    return `${(likes / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(likes);
}

export default function PostCard({ post, highlightQuery }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isPostLiked, isPostFavorited, toggleLike, toggleFavorite, engagementHydrated } =
    usePostStore();
  const desktopPostModal = useDesktopPostModalOptional();
  const [busy, setBusy] = useState<"like" | "favorite" | null>(null);
  const [actionError, setActionError] = useState("");

  const coverHeight = post.imageHeight ?? 240;
  const { isMerchant: merchantPost, authorHomeHref } = usePostAuthorContext({
    author: post.author,
    authorId: post.authorId,
    authorUsername: post.authorUsername,
  });
  const liked = isPostLiked(post.id);
  const favorited = isPostFavorited(post.id);
  const favoriteReady = !user || engagementHydrated;
  const loginRedirect = buildFavoriteLoginHref(post.id);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia("(min-width: 1024px)").matches && desktopPostModal) {
      event.preventDefault();
      desktopPostModal.openPostModal(post.id);
    }
  }

  async function handleLikeClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push(loginRedirect);
      return;
    }

    setBusy("like");
    setActionError("");
    try {
      await toggleLike(post.id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "点赞失败，请稍后重试",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleFavoriteClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push(loginRedirect);
      return;
    }

    if (!favoriteReady) {
      return;
    }

    setBusy("favorite");
    setActionError("");
    try {
      await toggleFavorite(post.id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "收藏失败，请稍后重试",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      onClick={handleClick}
      className="mb-2.5 block w-full cursor-pointer break-inside-avoid touch-manipulation lg:mb-4"
    >
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 transition-transform active:scale-[0.98] lg:rounded-3xl lg:shadow-md lg:shadow-zinc-200/50 lg:ring-zinc-100/80 lg:hover:-translate-y-0.5 lg:hover:shadow-lg lg:hover:shadow-zinc-200/60">
        {post.imageUrl ? (
          <div
            className="relative w-full overflow-hidden bg-zinc-100 lg:!h-80"
            style={{ height: coverHeight }}
          >
            {merchantPost ? (
              <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 inline-flex items-center rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-amber-300 backdrop-blur-sm lg:top-3 lg:left-3 lg:px-2.5 lg:text-[11px]">
                ⭐ 认证
              </div>
            ) : null}
            {post.linkedCoupon ? (
              <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 max-w-[calc(100%-1.25rem)] truncate rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm lg:bottom-3 lg:left-3 lg:px-2.5 lg:text-[11px]">
                {formatCouponAmountKrw(post.linkedCoupon.discountAmountKrw)}
              </div>
            ) : null}
            {favorited ? (
              <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-amber-300 backdrop-blur-sm">
                <StarIcon filled />
              </div>
            ) : null}
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              sizes="(max-width: 1024px) 50vw, 280px"
              className="pointer-events-none object-cover"
            />
          </div>
        ) : null}

        <div className="space-y-1.5 p-2.5 lg:space-y-2 lg:p-4">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-900 lg:text-[15px]">
            {merchantPost ? <MerchantTitleStar /> : null}
            {highlightQuery ? (
              <SearchHighlightText text={post.title} query={highlightQuery} />
            ) : (
              post.title
            )}
          </h3>

          {highlightQuery && post.content?.trim() ? (
            <p className="line-clamp-2 text-[11px] leading-snug text-zinc-500 lg:text-xs">
              <SearchHighlightText text={post.content} query={highlightQuery} />
            </p>
          ) : null}

          {post.linkedCoupon && !post.imageUrl ? (
            <p className="truncate text-[11px] font-medium text-amber-600">
              {formatCouponAmountKrw(post.linkedCoupon.discountAmountKrw)}
            </p>
          ) : null}

          {post.location?.trim() ? (
            <p className="truncate text-[11px] leading-tight text-zinc-400">
              <span aria-hidden="true">📍 </span>
              {post.location}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <PostAuthorLink
              author={post.author}
              href={authorHomeHref}
            >
              {merchantPost ? (
                <span className="hidden lg:inline-flex">
                  <MerchantVerifiedBadge size="sm" />
                </span>
              ) : null}
            </PostAuthorLink>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleLikeClick}
                disabled={busy === "like"}
                aria-label={liked ? "取消点赞" : "点赞"}
                aria-pressed={liked}
                className={`flex items-center gap-1 rounded-full px-1 py-0.5 text-xs disabled:opacity-60 ${
                  liked ? "text-rose-500" : "text-zinc-400"
                }`}
              >
                <HeartIcon filled={liked} />
                {formatLikes(post.likes)}
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                disabled={busy === "favorite" || !favoriteReady}
                aria-label={
                  !favoriteReady
                    ? "收藏状态加载中"
                    : favorited
                      ? "取消收藏"
                      : "收藏"
                }
                aria-pressed={favoriteReady ? favorited : undefined}
                aria-busy={!favoriteReady || busy === "favorite"}
                className={`flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-60 ${
                  favorited ? "text-amber-500" : "text-zinc-400"
                }`}
              >
                <StarIcon filled={favorited && favoriteReady} />
              </button>
            </div>
          </div>

          {actionError ? (
            <p className="text-[11px] leading-4 text-rose-500">{actionError}</p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${filled ? "text-rose-500" : "text-rose-400"}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function StarIcon({ filled = false }: { filled?: boolean }) {
  if (filled) {
    return (
      <svg
        className="h-3.5 w-3.5 text-amber-500"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    );
  }

  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}
