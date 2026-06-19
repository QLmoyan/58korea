"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import FrontendAdminPostBar from "@/components/frontend/FrontendAdminPostBar";
import PageHeader from "@/components/layout/PageHeader";
import CommentSection from "@/components/posts/CommentSection";
import PostImageCarousel from "@/components/posts/PostImageCarousel";
import ReportSheet from "@/components/report/ReportSheet";
import type { PostImage } from "@/lib/data/posts";
import { getAdminCapabilitiesAction } from "@/lib/actions/admin-capabilities";
import type { AdminCapabilities } from "@/lib/actions/admin-capabilities";
import { MODERATION_MEDIUM_DISCLAIMER } from "@/lib/moderation/constants";
import { usePostStore } from "@/lib/store/post-store";

function formatLikes(likes: number) {
  if (likes >= 1000) {
    return `${(likes / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(likes);
}

function formatPostTime(iso?: string) {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const postId = Number(params.id);
  const {
    getPostById,
    getPostImagesByPostId,
    loadPostImagesForPost,
    syncPostById,
    hydrated,
    canDeletePost,
    deletePost,
    getCommentsByPostId,
  } = usePostStore();
  const post = getPostById(postId);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [adminCapabilities, setAdminCapabilities] =
    useState<AdminCapabilities | null>(null);

  const ownedPost = post ? canDeletePost(post.id) : false;
  const commentCount = post ? getCommentsByPostId(post.id).length : 0;
  const postTimeLabel = post ? formatPostTime(post.createdAt) : null;

  useEffect(() => {
    if (Number.isFinite(postId)) {
      loadPostImagesForPost(postId);
    }
  }, [postId, loadPostImagesForPost]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminCapabilities() {
      try {
        const capabilities = await getAdminCapabilitiesAction();
        if (!cancelled) {
          setAdminCapabilities(capabilities);
        }
      } catch {
        if (!cancelled) {
          setAdminCapabilities({ isAdmin: false, role: null, permissions: [] });
        }
      }
    }

    loadAdminCapabilities();

    return () => {
      cancelled = true;
    };
  }, []);

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

  async function handleConfirmDeletePost() {
    if (!post) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await deletePost(post.id);
      router.push("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeleteError(`删除失败：${message}`);
      setDeleteConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  const headerAction =
    ownedPost && !deleteConfirming ? (
      <button
        type="button"
        onClick={() => {
          setDeleteConfirming(true);
          setDeleteError("");
        }}
        className="touch-manipulation rounded-full px-2 py-1 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50"
      >
        删除帖子
      </button>
    ) : ownedPost && deleteConfirming ? (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setDeleteConfirming(false)}
          disabled={deleting}
          className="touch-manipulation rounded-full px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600 disabled:opacity-60"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleConfirmDeletePost}
          disabled={deleting}
          className="touch-manipulation rounded-full px-2 py-1 text-xs font-medium text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-60"
        >
          {deleting ? "删除中" : "确认"}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="touch-manipulation rounded-full px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
      >
        举报
      </button>
    );

  if (!hydrated) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 sm:max-w-lg">
        <PageHeader title="帖子详情" />
        <div className="flex h-[60vh] items-center justify-center pt-14">
          <p className="text-sm text-zinc-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 sm:max-w-lg">
        <PageHeader title="帖子详情" />
        <div className="flex h-[60vh] flex-col items-center justify-center gap-3 pt-14">
          <p className="text-sm text-zinc-500">帖子不存在或已被删除</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 pb-24 sm:max-w-lg">
      <PageHeader title="帖子详情" action={headerAction} />

      <main className="pt-14">
        {deleteConfirming ? (
          <div className="border-b border-rose-100 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-600">
            删除后，{commentCount > 0 ? `${commentCount} 条评论和` : ""}
            所有图片记录将一并删除，且无法恢复。
          </div>
        ) : null}

        {deleteError ? (
          <div className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-500">
            {deleteError}
          </div>
        ) : null}

        <article className="bg-white">
          <div className="flex items-center gap-2.5 border-b border-zinc-100 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-sm font-bold text-white">
              {post.author.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {post.author}
              </p>
              <p className="truncate text-[11px] text-zinc-400">
                {post.location} · {post.distance}
                {postTimeLabel ? ` · ${postTimeLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 touch-manipulation rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-500"
              aria-label="关注作者"
            >
              关注
            </button>
          </div>

          {displayImages.length > 0 ? (
            <PostImageCarousel images={displayImages} title={post.title} />
          ) : null}

          <div className="space-y-1.5 px-3 pb-2 pt-2.5">
            <h1 className="text-xl font-bold leading-snug text-zinc-900">
              {post.title}
            </h1>

            <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {post.content}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-500">
                {post.category === "住房" ? "租房" : post.category}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm text-zinc-500">
                <HeartIcon />
                {formatLikes(post.likes)}
              </span>
            </div>

            {post.riskLevel === "medium" ? (
              <p className="rounded-xl bg-zinc-100 px-3 py-2 text-xs leading-5 text-zinc-500">
                {MODERATION_MEDIUM_DISCLAIMER}
              </p>
            ) : null}

            {adminCapabilities?.isAdmin ? (
              <FrontendAdminPostBar
                postId={post.id}
                permissions={adminCapabilities.permissions}
                riskLevel={post.riskLevel}
                onUpdated={() => syncPostById(post.id)}
                onHidden={() => router.push("/")}
                onDeleted={() => router.push("/")}
              />
            ) : null}
          </div>
        </article>

        <CommentSection
          postId={post.id}
          adminCapabilities={adminCapabilities}
        />
      </main>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={String(post.id)}
        postId={post.id}
        targetLabel="举报该帖子"
      />
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
