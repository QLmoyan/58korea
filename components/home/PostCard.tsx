"use client";

import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/data/posts";

interface PostCardProps {
  post: Post;
}

function formatLikes(likes: number) {
  if (likes >= 1000) {
    return `${(likes / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(likes);
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <Link
      href={`/posts/${post.id}`}
      className="mb-2.5 block w-full cursor-pointer break-inside-avoid touch-manipulation"
    >
      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 transition-transform active:scale-[0.98]">
        <div
          className="relative w-full overflow-hidden bg-zinc-100"
          style={{ height: post.imageHeight }}
        >
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 448px) 50vw, 200px"
            className="pointer-events-none object-cover"
          />
        </div>

        <div className="space-y-1.5 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-900">
            {post.title}
          </h3>

          <p className="truncate text-[11px] leading-tight text-zinc-400">
            <span aria-hidden="true">📍 </span>
            {post.location}
            <span className="mx-1 text-zinc-300">·</span>
            <span className="text-[10px] text-zinc-400">{post.distance}</span>
          </p>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white">
                {post.author.slice(0, 1)}
              </div>
              <span className="truncate text-xs text-zinc-500">
                {post.author}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
              <HeartIcon />
              {formatLikes(post.likes)}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-rose-400"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
