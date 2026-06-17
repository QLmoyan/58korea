"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePostStore } from "@/lib/store/post-store";
import type { Comment } from "@/lib/types/community";
import {
  buildCommentThreads,
  resolveReplyTarget,
} from "@/lib/utils/comments";

interface CommentSectionProps {
  postId: number;
}

interface SelectedCommentImage {
  file: File;
  previewUrl: string;
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
  canDelete?: boolean;
  confirmingDelete?: boolean;
  deleting?: boolean;
  onReply: (comment: Comment) => void;
  onDeleteClick: (comment: Comment) => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: (comment: Comment) => void;
}

function CommentItem({
  comment,
  isReply = false,
  canDelete = false,
  confirmingDelete = false,
  deleting = false,
  onReply,
  onDeleteClick,
  onDeleteCancel,
  onDeleteConfirm,
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
        <p
          className={
            isReply
              ? "text-[12px] font-medium leading-5 text-zinc-800"
              : "text-[13px] font-medium leading-5 text-zinc-800"
          }
        >
          {comment.author}
        </p>

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
          <div
            className={`relative aspect-[4/3] max-w-[200px] overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 ${
              hasText ? "mt-2" : "mt-0.5"
            }`}
          >
            <Image
              src={comment.imageUrl}
              alt="评论图片"
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>
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

export default function CommentSection({ postId }: CommentSectionProps) {
  const {
    getCommentsByPostId,
    addComment,
    loadCommentsForPost,
    canDeleteComment,
    deleteComment,
  } = usePostStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim() && !selectedImage) {
      setError("请输入留言内容或上传图片");
      return;
    }

    setSubmitting(true);

    try {
      const reply = replyingTo ? resolveReplyTarget(replyingTo) : undefined;
      await addComment(postId, {
        content: input,
        reply,
        image: selectedImage?.file,
      });
      setInput("");
      setReplyingTo(null);
      clearSelectedImage();
      setError("");
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

  return (
    <section className="border-t border-zinc-100 bg-white">
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          共 {comments.length} 条评论
        </h2>
      </div>

      <div className="px-4 pb-4">
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
                  canDelete={canDeleteComment(root.id)}
                  confirmingDelete={confirmingDeleteId === root.id}
                  deleting={deletingCommentId === root.id}
                  onReply={startReply}
                  onDeleteClick={handleDeleteClick}
                  onDeleteCancel={handleDeleteCancel}
                  onDeleteConfirm={handleDeleteConfirm}
                />

                {replies.length > 0 ? (
                  <div className="ml-8 mt-2 space-y-3 rounded-xl bg-zinc-50 px-3 py-2.5">
                    {replies.map((reply) => (
                      <CommentItem
                        key={reply.id}
                        comment={reply}
                        isReply
                        canDelete={canDeleteComment(reply.id)}
                        confirmingDelete={confirmingDeleteId === reply.id}
                        deleting={deletingCommentId === reply.id}
                        onReply={startReply}
                        onDeleteClick={handleDeleteClick}
                        onDeleteCancel={handleDeleteCancel}
                        onDeleteConfirm={handleDeleteConfirm}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur-md"
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

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(selectedImage)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 disabled:opacity-40"
            aria-label="上传图片"
          >
            <ImageIcon />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            placeholder={inputPlaceholder}
            rows={1}
            className="max-h-24 min-h-[40px] flex-1 resize-none rounded-full bg-zinc-100 px-4 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-100"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:opacity-60"
          >
            发送
          </button>
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
      </form>
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
