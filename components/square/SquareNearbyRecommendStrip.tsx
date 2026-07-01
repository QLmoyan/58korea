"use client";

import Image from "next/image";
import Link from "next/link";
import type { Post } from "@/lib/data/posts";
import { formatNearbyRecommendLocation } from "@/lib/square/nearby-recommend-posts";
import { resolvePostThumbnailUrl } from "@/lib/square/post-list-utils";
import { useDesktopPostModalOptional } from "@/lib/store/desktop-post-modal-store";

interface SquareNearbyRecommendStripProps {
  posts: Post[];
}

function NearbyRecommendCard({ post }: { post: Post }) {
  const desktopPostModal = useDesktopPostModalOptional();
  const imageUrl = resolvePostThumbnailUrl(post);

  if (!imageUrl) {
    return null;
  }

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
      className="block w-[112px] shrink-0 touch-manipulation active:opacity-90 sm:w-[116px]"
      data-testid="square-nearby-recommend-card"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-100">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 112px, 116px"
          className="object-cover"
        />
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-[15px] text-zinc-800">
        {post.title}
      </h3>
      <p className="mt-0.5 truncate text-[10px] leading-[14px] text-zinc-400">
        {formatNearbyRecommendLocation(post.location)}
      </p>
    </Link>
  );
}

export default function SquareNearbyRecommendStrip({
  posts,
}: SquareNearbyRecommendStripProps) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-white px-4 py-3 lg:px-0"
      data-testid="square-nearby-recommend-strip"
    >
      <p className="text-[11px] font-medium text-zinc-400">附近推荐</p>
      <div className="scrollbar-hide -mx-4 mt-2 flex gap-2.5 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:gap-3 lg:px-0">
        {posts.map((post) => (
          <NearbyRecommendCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
