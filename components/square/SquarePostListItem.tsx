"use client";

import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/data/posts";
import {
  formatPostExcerpt,
  formatPostListMeta,
  resolvePostThumbnailUrl,
} from "@/lib/square/post-list-utils";
import { useDesktopPostModalOptional } from "@/lib/store/desktop-post-modal-store";

interface SquarePostListItemProps {
  post: Post;
  commentCount?: number;
}

function PostThumbnailPlaceholder() {
  return (
    <div
      className="h-full w-full bg-zinc-100"
      aria-hidden="true"
    />
  );
}

export default function SquarePostListItem({
  post,
  commentCount = 0,
}: SquarePostListItemProps) {
  const desktopPostModal = useDesktopPostModalOptional();
  const thumbnailUrl = resolvePostThumbnailUrl(post);
  const excerpt = formatPostExcerpt(post.content);
  const meta = formatPostListMeta(post.location, post.createdAt, commentCount);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia("(min-width: 1024px)").matches && desktopPostModal) {
      event.preventDefault();
      desktopPostModal.openPostModal(post.id);
    }
  }

  return (
    <Link
      href={`/posts/${post.id}`}
      onClick={handleClick}
      className="flex touch-manipulation items-start gap-3 px-4 py-2.5 active:bg-zinc-50/80 lg:px-0"
      data-testid="square-post-list-item"
    >
      <div className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:h-[88px] sm:w-[88px]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 84px, 88px"
            className="object-cover"
          />
        ) : (
          <PostThumbnailPlaceholder />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-[18px] text-zinc-900 lg:text-sm lg:leading-5">
          {post.title}
        </h3>

        {excerpt ? (
          <p className="line-clamp-2 text-[11px] leading-[15px] text-zinc-500">
            {excerpt}
          </p>
        ) : null}

        <p className="line-clamp-1 pt-0.5 text-[10px] leading-[14px] text-zinc-400">
          {meta}
        </p>
      </div>
    </Link>
  );
}
