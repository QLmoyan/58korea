"use client";

import { useEffect, useMemo, useState } from "react";
import FrontendAdminPostBar from "@/components/frontend/FrontendAdminPostBar";
import MerchantDetailTitleMeta from "@/components/merchant/MerchantDetailTitleMeta";
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
import { usePendingFavoriteOnLogin } from "@/lib/hooks/use-pending-favorite-on-login";
import { usePostAuthorContext } from "@/lib/merchant/use-post-merchant";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePostStore } from "@/lib/store/post-store";
import { logClientError } from "@/lib/utils/log-client-error";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";

interface PostDetailOverlayContentProps {
  postId: number;
  onClose: () => void;
  onDeleted?: () => void;
  onHidden?: () => void;
}

export default function PostDetailOverlayContent({
  postId,
  onClose,
  onDeleted,
  onHidden,
}: PostDetailOverlayContentProps) {
  usePendingFavoriteOnLogin(postId);
  const { user } = useAuthStore();
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
      onDeleted?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeleteError(`删除失败：${message}`);
      setDeleteConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  function handleHidden() {
    onHidden?.();
    onClose();
  }

  function handleAdminDeleted() {
    onDeleted?.();
    onClose();
  }

  const waitingForPost = hydrated && !post && !postFetchDone;
  const postFetchOverdue = useLoadingDeadline(waitingForPost, FEED_UI_DEADLINE_MS);

  if (!hydrated || waitingForPost) {
    return (
      <div className="flex h-full items-center justify-center">
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
    );
  }

  if (!post) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-500">
        <p>帖子不存在或已被删除</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600"
        >
          关闭
        </button>
      </div>
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
      <div className="flex h-full min-h-0 w-1/2 shrink-0 bg-zinc-950">
        {displayImages.length > 0 ? (
          <PostImageCarousel
            images={displayImages}
            title={post.title}
            variant="desktop-modal"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            暂无图片
          </div>
        )}
      </div>

      <div className="flex min-h-0 w-1/2 flex-col bg-white">
        <PostDetailTopBar
          author={post.author}
          showMerchantBadge={merchantPost}
          authorHomeHref={authorHomeHref}
          variant="embedded"
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

        {deleteConfirming ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs leading-5 text-rose-600">
            删除后，{commentCount > 0 ? `${commentCount} 条评论和` : ""}
            所有图片记录将一并删除，且无法恢复。
          </div>
        ) : null}

        {deleteError ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-500">
            {deleteError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 space-y-2 border-b border-zinc-100 px-4 py-3">
              <MerchantDetailTitleMeta
                title={post.title}
                location={locationLabel}
                isMerchant={merchantPost}
                titleClassName="text-lg font-bold leading-snug text-zinc-900"
              />
              <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {post.content}
              </div>
              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-500">
                {post.category}
              </span>
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
                  onHidden={handleHidden}
                  onDeleted={handleAdminDeleted}
                />
              ) : null}
            </div>

            <CommentSection
              postId={post.id}
              postTitle={post.title}
              postAuthor={post.author}
              adminCapabilities={adminCapabilities}
              postLikes={post.likes}
              layout="desktop-modal"
            />
          </div>
        </div>
      </div>

      <ReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={String(post.id)}
        postId={post.id}
        targetLabel="举报该帖子"
      />
    </>
  );
}
