"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useImageViewer } from "@/lib/store/image-viewer-store";
import { usePostStore } from "@/lib/store/post-store";
import type { Comment } from "@/lib/types/community";
import ReportSheet from "@/components/report/ReportSheet";
import MerchantVerifiedBadge from "@/components/merchant/MerchantVerifiedBadge";
import FrontendAdminCommentActions from "@/components/frontend/FrontendAdminCommentActions";
import type { AdminCapabilities } from "@/lib/actions/admin-capabilities";
import {
  buildCommentThreads,
  resolveReplyTarget,
} from "@/lib/utils/comments";
import { isMerchantAuthorComment } from "@/lib/merchant/identify";

interface CommentSectionProps {
  postId: number;
  postAuthor?: string;
  adminCapabilities?: AdminCapabilities | null;
  postLikes?: number;
  viewCountPlaceholder?: number;
  layout?: "page" | "desktop-modal";
}

interface SelectedCommentImage {
  file: File;
  previewUrl: string;
}

function formatCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  showMerchantBadge?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
  confirmingDelete?: boolean;
  deleting?: boolean;
  onReply: (comment: Comment) => void;
  onReport: (comment: Comment) => void;
  onDeleteClick: (comment: Comment) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (comment: Comment) => void;
  onImageClick: (comment: Comment) => void;
  adminCapabilities?: AdminCapabilities | null;
  onAdminUpdated?: () => void | Promise<void>;
}

function CommentItem({
  comment,
  isReply = false,
  showMerchantBadge = false,
  canDelete = false,
  canReport = false,
  confirmingDelete = false,
  deleting = false,
  onReply,
  onReport,
  onDeleteClick,
  onDeleteCancel,
  onDeleteConfirm,
  onImageClick,
  adminCapabilities,
  onAdminUpdated,
}: CommentItemProps) {
  const hasText = comment.content.trim().length > 0;
  const isRootComment = !comment.parentId;

  return (
    <article className="flex gap-2.5">
      <div
        className={
          isReply
            ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[10px] font-bold text-white"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white"
        }
      >
        {comment.author.slice(0, 1)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className={
              isReply
                ? "text-[12px] font-medium leading-5 text-zinc-800"
                : "text-[13px] font-medium leading-5 text-zinc-800"
            }
          >
            {comment.author}
          </p>
          {showMerchantBadge ? <MerchantVerifiedBadge size="sm" /> : null}
        </div>

        {hasText ? (
          <p className="mt-0.5 text-sm leading-6 text-zinc-700">
            {comment.replyToAuthor ? (
              <>
                <span className="text-zinc-400">回复 </span>
                <span className="font-medium text-zinc-500">
                  {comment.replyToAuthor}
                </span>
                <span className="text-zinc-700"> {comment.content}</span>
              </>
            ) : (
              comment.content
            )}
          </p>
        ) : null}

        {comment.imageUrl ? (
          <button
            type="button"
            onClick={() => onImageClick(comment)}
            className={`relative aspect-[4/3] max-w-[200px] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 touch-manipulation cursor-zoom-in ${
              hasText ? "mt-2" : "mt-0.5"
            }`}
          >
            <Image
              src={comment.imageUrl}
              alt="评论图片"
              fill
              sizes="200px"
              className="pointer-events-none object-cover"
            />
          </button>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <time className="text-[11px] text-zinc-400">
            {formatTime(comment.createdAt)}
          </time>
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="touch-manipulation text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
          >
            回复
          </button>
          {canReport ? (
            <button
              type="button"
              onClick={() => onReport(comment)}
              className="touch-manipulation text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              举报
            </button>
          ) : null}
          {adminCapabilities?.isAdmin ? (
            <FrontendAdminCommentActions
              commentId={comment.id}
              permissions={adminCapabilities.permissions}
              isReply={isReply}
              onUpdated={onAdminUpdated}
            />
          ) : null}
          {canDelete && !confirmingDelete ? (
            <button
              type="button"
              onClick={() => onDeleteClick(comment)}
              className="touch-manipulation text-[11px] font-medium text-rose-400 transition-colors hover:text-rose-500"
            >
              删除
            </button>
          ) : null}
          {canDelete && confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onDeleteCancel}
                disabled={deleting}
                className="touch-manipulation text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-600 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => onDeleteConfirm(comment)}
                disabled={deleting}
                className="touch-manipulation text-[11px] font-medium text-rose-500 transition-colors hover:text-rose-600 disabled:opacity-60"
              >
                {deleting ? "删除中" : "确认删除"}
              </button>
            </>
          ) : null}
        </div>
        {canDelete && confirmingDelete ? (
          <p className="mt-1 text-[11px] leading-4 text-rose-500">
            {isRootComment
              ? "删除后，其下回复也会一起删除，且无法恢复。"
              : "确定删除这条回复？删除后无法恢复。"}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export default function CommentSection({
  postId,
  postAuthor = "",
  adminCapabilities = null,
  postLikes = 0,
  viewCountPlaceholder = 0,
  layout = "page",
}: CommentSectionProps) {
  const {
    getCommentsByPostId,
    addComment,
    loadCommentsForPost,
    canDeleteComment,
    deleteComment,
  } = usePostStore();
  const { openViewer } = useImageViewer();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<SelectedCommentImage | null>(
    null,
  );
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const comments = getCommentsByPostId(postId);
  const threads = useMemo(() => buildCommentThreads(comments), [comments]);

  useEffect(() => {
    loadCommentsForPost(postId);
  }, [postId, loadCommentsForPost]);

  function clearSelectedImage() {
    setSelectedImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }

  function handlePickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    clearSelectedImage();
    setSelectedImage({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    setError("");
  }

  function startReply(comment: Comment) {
    setReplyingTo(comment);
    setError("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function cancelReply() {
    setReplyingTo(null);
    setError("");
  }

  function handleDeleteClick(comment: Comment) {
    setConfirmingDeleteId(comment.id);
    setError("");
  }

  function handleDeleteCancel() {
    setConfirmingDeleteId(null);
  }

  async function handleDeleteConfirm(comment: Comment) {
    setDeletingCommentId(comment.id);
    setError("");

    try {
      await deleteComment(postId, comment.id);
      if (replyingTo?.id === comment.id) {
        setReplyingTo(null);
      }
      setConfirmingDeleteId(null);
    } catch (deleteError) {
      const rawMessage =
        deleteError instanceof Error
          ? deleteError.message
          : String(deleteError);
      setError(`删除失败：${rawMessage}`);
    } finally {
      setDeletingCommentId(null);
    }
  }

  function handleCommentImageClick(comment: Comment) {
    if (!comment.imageUrl) {
      return;
    }

    openViewer({
      images: [
        {
          id: comment.id,
          url: comment.imageUrl,
          alt: "评论图片",
        },
      ],
      initialIndex: 0,
    });
  }

  function handleReportClick(comment: Comment) {
    setReportTarget(comment);
    setError("");
  }

  function showComingSoon() {
    setInfoNotice("功能开发中");
    window.setTimeout(() => {
      setInfoNotice((current) => (current === "功能开发中" ? "" : current));
    }, 2000);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() && !selectedImage) {
      setError("请输入留言内容或上传图片");
      return;
    }

    setSubmitting(true);
    setInfoNotice("");

    try {
      const reply = replyingTo ? resolveReplyTarget(replyingTo) : undefined;
      const result = await addComment(postId, {
        content: input,
        reply,
        image: selectedImage?.file,
      });
      setInput("");
      setReplyingTo(null);
      clearSelectedImage();
      setError("");
      if (result.notice) {
        setInfoNotice(result.notice);
      }
    } catch (submitError) {
      const rawMessage =
        submitError instanceof Error
          ? submitError.message
          : String(submitError);
      console.error("Comment submit failed:", submitError);
      setError(`留言发送失败：${rawMessage}`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputPlaceholder = replyingTo
    ? `回复 ${replyingTo.author}`
    : "说点什么...";

  const isDesktopModal = layout === "desktop-modal";

  function shouldShowMerchantCommentBadge(commentAuthor: string) {
    if (!postAuthor) {
      return false;
    }

    return isMerchantAuthorComment(postAuthor, commentAuthor);
  }

  const commentList = (
    <>
      {threads.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          还没有留言，来抢沙发吧
        </p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="py-3 first:pt-0 last:pb-0">
              <CommentItem
                comment={root}
                showMerchantBadge={shouldShowMerchantCommentBadge(root.author)}
                canDelete={canDeleteComment(root.id)}
                canReport={!canDeleteComment(root.id)}
                confirmingDelete={confirmingDeleteId === root.id}
                deleting={deletingCommentId === root.id}
                onReply={startReply}
                onReport={handleReportClick}
                onDeleteClick={handleDeleteClick}
                onDeleteCancel={handleDeleteCancel}
                onDeleteConfirm={handleDeleteConfirm}
                onImageClick={handleCommentImageClick}
                adminCapabilities={adminCapabilities}
                onAdminUpdated={() => loadCommentsForPost(postId)}
              />

              {replies.length > 0 ? (
                <div className="ml-8 mt-2 space-y-3 rounded-xl bg-zinc-50 px-3 py-2.5">
                  {replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      isReply
                      showMerchantBadge={shouldShowMerchantCommentBadge(reply.author)}
                      canDelete={canDeleteComment(reply.id)}
                      canReport={!canDeleteComment(reply.id)}
                      confirmingDelete={confirmingDeleteId === reply.id}
                      deleting={deletingCommentId === reply.id}
                      onReply={startReply}
                      onReport={handleReportClick}
                      onDeleteClick={handleDeleteClick}
                      onDeleteCancel={handleDeleteCancel}
                      onDeleteConfirm={handleDeleteConfirm}
                      onImageClick={handleCommentImageClick}
                      adminCapabilities={adminCapabilities}
                      onAdminUpdated={() => loadCommentsForPost(postId)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const commentForm = (
    <form
      onSubmit={handleSubmit}
      className={
        isDesktopModal
          ? "shrink-0 border-t border-zinc-100 bg-white"
          : "fixed right-0 bottom-0 left-0 z-40 border-t border-zinc-100 bg-white/95 backdrop-blur-md"
      }
    >
      <div
        className={
          isDesktopModal
            ? "px-4 py-3"
            : "mx-auto max-w-full px-3 py-2.5 sm:max-w-lg"
        }
      >
        {replyingTo ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-zinc-500">
              正在回复{" "}
              <span className="font-medium text-zinc-700">
                {replyingTo.author}
              </span>
            </span>
            <button
              type="button"
              onClick={cancelReply}
              className="shrink-0 touch-manipulation text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              取消
            </button>
          </div>
        ) : null}

        {selectedImage ? (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
              <Image
                src={selectedImage.previewUrl}
                alt="待发送图片"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <button
              type="button"
              onClick={clearSelectedImage}
              className="touch-manipulation text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              移除图片
            </button>
          </div>
        ) : null}

        {inputFocused ? (
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={showComingSoon}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200"
              aria-label="添加图片"
            >
              <ImageIcon />
            </button>
            <button
              type="button"
              onClick={showComingSoon}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200"
              aria-label="添加表情"
            >
              <EmojiIcon />
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setInputFocused(false), 120);
            }}
            placeholder={inputPlaceholder}
            rows={1}
            className="max-h-20 min-h-[36px] flex-1 resize-none rounded-full bg-zinc-100 px-3.5 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-100"
          />

          {input.trim() || selectedImage ? (
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-60"
            >
              发送
            </button>
          ) : null}

          <button
            type="button"
            onClick={showComingSoon}
            className="flex shrink-0 flex-col items-center gap-0.5 px-0.5 text-zinc-500"
            aria-label="点赞"
          >
            <HeartIcon />
            <span className="text-[10px] leading-none">
              {formatCount(postLikes)}
            </span>
          </button>

          <button
            type="button"
            onClick={showComingSoon}
            className="flex shrink-0 flex-col items-center gap-0.5 px-0.5 text-zinc-500"
            aria-label="收藏"
          >
            <StarIcon />
            <span className="text-[10px] leading-none">收藏</span>
          </button>

          <div
            className="flex shrink-0 flex-col items-center gap-0.5 px-0.5 text-zinc-400"
            aria-label="浏览量"
          >
            <EyeIcon />
            <span className="text-[10px] leading-none">
              {formatCount(viewCountPlaceholder)}
            </span>
          </div>

          {isDesktopModal ? (
            <button
              type="button"
              onClick={showComingSoon}
              className="flex shrink-0 flex-col items-center gap-0.5 px-0.5 text-zinc-500"
              aria-label="分享"
            >
              <ShareIcon />
              <span className="text-[10px] leading-none">分享</span>
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickImage}
        />

        {error ? (
          <p className="mt-2 text-xs text-rose-500">{error}</p>
        ) : null}

        {infoNotice ? (
          <p className="mt-2 text-xs leading-5 text-amber-700">{infoNotice}</p>
        ) : null}
      </div>
    </form>
  );

  return (
    <section
      className={
        isDesktopModal
          ? "flex min-h-0 flex-1 flex-col bg-white"
          : "border-t border-zinc-100 bg-white"
      }
    >
      <div className={`px-4 py-3 ${isDesktopModal ? "shrink-0" : ""}`}>
        <h2 className="text-sm font-semibold text-zinc-900">
          共 {comments.length} 条评论
        </h2>
      </div>

      <div
        className={
          isDesktopModal
            ? "min-h-0 flex-1 overflow-y-auto px-4 pb-2"
            : "px-4 pb-24"
        }
      >
        {commentList}
      </div>

      {commentForm}

      <ReportSheet
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        targetType="comment"
        targetId={reportTarget?.id ?? ""}
        postId={postId}
        targetLabel={reportTarget?.parentId ? "举报该回复" : "举报该评论"}
      />
    </section>
  );
}

function ImageIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function EmojiIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-5 w-5 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="h-5 w-5"
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

function EyeIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}
