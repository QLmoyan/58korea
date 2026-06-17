"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import PageHeader from "@/components/layout/PageHeader";
import CommentSection from "@/components/posts/CommentSection";
import PostImageCarousel from "@/components/posts/PostImageCarousel";
import type { PostImage } from "@/lib/data/posts";
import { usePostStore } from "@/lib/store/post-store";

function formatLikes(likes: number) {
  if (likes >= 1000) {
    return `${(likes / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(likes);
}

export default function PostDetailContent() {
  const params = useParams();
  const postId = Number(params.id);
  const {
    getPostById,
    getPostImagesByPostId,
    loadPostImagesForPost,
    hydrated,
  } = usePostStore();
  const post = getPostById(postId);

  useEffect(() => {
    if (Number.isFinite(postId)) {
      loadPostImagesForPost(postId);
    }
  }, [postId, loadPostImagesForPost]);

  const displayImages = useMemo((): PostImage[] => {
    if (!post) {
      return [];
    }

    const loadedImages = getPostImagesByPostId(post.id);
    if (loadedImages.length > 0) {
      return loadedImages;
    }

    if (post.images && post.images.length > 0) {
      return post.images;
    }

    if (post.imageUrl) {
      return [
        {
          id: `cover-${post.id}`,
          url: post.imageUrl,
          sortOrder: 0,
          height: post.imageHeight,
        },
      ];
    }

    return [];
  }, [post, getPostImagesByPostId]);

  if (!hydrated) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-zinc-50">
        <PageHeader title="帖子详情" />
        <div className="flex h-[60vh] items-center justify-center pt-14">
          <p className="text-sm text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-zinc-50">
        <PageHeader title="帖子详情" />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 pt-14">
          <p className="text-sm text-zinc-500">帖子不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-24">
      <PageHeader title="帖子详情" />

      <main className="pt-14">
        <article className="bg-white">
          {displayImages.length > 0 ? (
            <PostImageCarousel images={displayImages} title={post.title} />
          ) : null}

          <div className="space-y-4 px-4 py-4">
            <h1 className="text-lg font-bold leading-snug text-zinc-900">
              {post.title}
            </h1>

            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white">
                  {post.author.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {post.author}
                  </p>
                  <p className="truncate text-[11px] text-zinc-400">
                    📍 {post.location} · {post.distance}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm text-zinc-500">
                <HeartIcon />
                {formatLikes(post.likes)}
              </span>
            </div>

            <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-500">
              {post.category === "住房" ? "租房" : post.category}
            </span>

            <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">
              {post.content}
            </div>
          </div>
        </article>

        <CommentSection postId={post.id} />
      </main>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg
      className="h-4 w-4 text-rose-400"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
