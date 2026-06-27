"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import FrontendAdminPostBar from "@/components/frontend/FrontendAdminPostBar";
import MerchantDetailTitleMeta from "@/components/merchant/MerchantDetailTitleMeta";
import DesktopPostDetailModal from "@/components/posts/DesktopPostDetailModal";
import CommentSection from "@/components/posts/CommentSection";
import PostDetailTopBar from "@/components/posts/PostDetailTopBar";
import PostLinkedCouponSection from "@/components/posts/PostLinkedCouponSection";
import PostImageCarousel from "@/components/posts/PostImageCarousel";
import ReportSheet from "@/components/report/ReportSheet";
import type { PostImage } from "@/lib/data/posts";
import { getAdminCapabilitiesAction } from "@/lib/actions/admin-capabilities";
import type { AdminCapabilities } from "@/lib/actions/admin-capabilities";
import { MODERATION_MEDIUM_DISCLAIMER } from "@/lib/moderation/constants";
import { FEED_UI_DEADLINE_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { usePostAuthorContext } from "@/lib/merchant/use-post-merchant";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePostStore } from "@/lib/store/post-store";
import { logClientError } from "@/lib/utils/log-client-error";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { usePendingFavoriteOnLogin } from "@/lib/hooks/use-pending-favorite-on-login";
import Link from "next/link";

export default function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const postId = Number(params.id);
  usePendingFavoriteOnLogin(postId);
  const {
    getPostById,
    getPostImagesByPostId,
    loadPostImagesForPost,
    syncPostById,
    hydrated,
    canDeletePost,
    deletePost,
    getCommentsByPostId,
    recordPostView,
  } = usePostStore();
  const post = getPostById(postId);
  const [postFetchDone, setPostFetchDone] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [adminCapabilities, setAdminCapabilities] =
    useState<AdminCapabilities | null>(null);

  const ownedPost = post ? canDeletePost(post.id) : false;
  const commentCount = post ? getCommentsByPostId(post.id).length : 0;

  useEffect(() => {
    if (Number.isFinite(postId)) {
      loadPostImagesForPost(postId);
    }
  }, [postId, loadPostImagesForPost]);

  useEffect(() => {
    if (!hydrated || !Number.isFinite(postId) || post) {
      if (post) {
        setPostFetchDone(true);
      }
      return;
    }

    let cancelled = false;
    setPostFetchDone(false);

    void syncPostById(postId)
      .catch((error) => {
        logClientError("posts.detail.sync", error, { postId });
      })
      .finally(() => {
        if (!cancelled) {
          setPostFetchDone(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, post, postId, syncPostById]);

  useEffect(() => {
    if (!user || !post || !Number.isFinite(postId)) {
      return;
    }

    void recordPostView(postId);
  }, [user?.id, post?.id, postId, recordPostView]);

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

  const waitingForPost = hydrated && !post && !postFetchDone;
  const postFetchOverdue = useLoadingDeadline(waitingForPost, FEED_UI_DEADLINE_MS);

  if (!hydrated || waitingForPost) {
    return (
      <>
        <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 pb-28 lg:hidden sm:max-w-lg">
          <SimpleBackHeader />
          <div className="flex h-[60vh] items-center justify-center pt-12">
            {postFetchOverdue ? (
              <AsyncStatePanel
                message="帖子加载超时，请检查网络后重试"
                tone="error"
                onRetry={() => {
                  setPostFetchDone(false);
                  void syncPostById(postId).finally(() => setPostFetchDone(true));
                }}
              />
            ) : (
              <AsyncStatePanel message="加载中..." />
            )}
          </div>
        </div>
        <div className="hidden min-h-screen items-center justify-center bg-zinc-50 lg:flex">
          <AsyncStatePanel message="加载中..." />
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 pb-28 lg:hidden sm:max-w-lg">
          <SimpleBackHeader />
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 pt-12">
            <p className="text-sm text-zinc-500">帖子不存在或已被删除</p>
          </div>
        </div>
        <div className="hidden min-h-screen items-center justify-center bg-zinc-50 lg:flex">
          <p className="text-sm text-zinc-500">帖子不存在或已被删除</p>
        </div>
      </>
    );
  }

  const locationLabel = post.location?.trim();
  const { isMerchant: merchantPost, authorHomeHref } = usePostAuthorContext({
    author: post.author,
    authorId: post.authorId,
    authorUsername: post.authorUsername,
  });

  return (
    <>
      <div className="mx-auto min-h-screen w-full max-w-full bg-zinc-50 pb-28 lg:hidden sm:max-w-lg">
      <PostDetailTopBar
        author={post.author}
        showMerchantBadge={merchantPost}
        authorHomeHref={authorHomeHref}
        ownedPost={ownedPost}
        deleteConfirming={deleteConfirming}
        deleting={deleting}
        onReport={() => setReportOpen(true)}
        onDeleteClick={() => {
          setDeleteConfirming(true);
          setDeleteError("");
        }}
        onDeleteCancel={() => setDeleteConfirming(false)}
        onDeleteConfirm={handleConfirmDeletePost}
      />

      <main className="pt-12">
        {deleteConfirming ? (
          <div className="border-b border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-600">
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
          {displayImages.length > 0 ? (
            <PostImageCarousel images={displayImages} title={post.title} />
          ) : null}

          <div className="space-y-1.5 px-3 pb-2 pt-2">
            <MerchantDetailTitleMeta
              title={post.title}
              location={locationLabel}
              isMerchant={merchantPost}
            />

            <div className="whitespace-pre-wrap pt-0.5 text-sm leading-6 text-zinc-700">
              {post.content}
            </div>

            <div className="pt-1">
              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-500">
                {post.category}
              </span>
            </div>

            {post.linkedCoupon ? (
              <PostLinkedCouponSection
                postId={post.id}
                postTitle={post.title}
                postAuthorId={post.authorId}
                linkedCoupon={post.linkedCoupon}
                onUpdated={() => void syncPostById(post.id)}
              />
            ) : null}

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
                onUpdated={() => void syncPostById(post.id)}
                onHidden={() => router.push("/")}
                onDeleted={() => router.push("/")}
              />
            ) : null}
          </div>
        </article>

        <CommentSection
          postId={post.id}
          postTitle={post.title}
          postAuthor={post.author}
          adminCapabilities={adminCapabilities}
          postLikes={post.likes}
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

      <div className="hidden lg:block">
        <DesktopPostDetailModal
          postId={postId}
          onClose={() => router.push("/")}
        />
      </div>
    </>
  );
}

function SimpleBackHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-full items-center px-2 sm:max-w-lg sm:px-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
          aria-label="返回"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
      </div>
    </header>
  );
}
