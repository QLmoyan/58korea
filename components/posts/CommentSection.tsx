"use client";

import { useEffect, useState } from "react";
import { usePostStore } from "@/lib/store/post-store";

interface CommentSectionProps {
  postId: number;
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

export default function CommentSection({ postId }: CommentSectionProps) {
  const { getCommentsByPostId, addComment, loadCommentsForPost } = usePostStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const comments = getCommentsByPostId(postId);

  useEffect(() => {
    loadCommentsForPost(postId);
  }, [postId, loadCommentsForPost]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError("请输入留言内容");
      return;
    }

    try {
      await addComment(postId, input);
      setInput("");
      setError("");
    } catch {
      setError("留言发送失败，请稍后重试");
    }
  }

  return (
    <section className="border-t border-zinc-100 bg-white">
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          留言 {comments.length > 0 ? `(${comments.length})` : ""}
        </h2>
      </div>

      <div className="space-y-3 px-4 pb-4">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            还没有留言，来抢沙发吧
          </p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-2xl bg-zinc-50 px-3 py-3 ring-1 ring-zinc-100"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-[11px] font-bold text-white">
                    {comment.author.slice(0, 1)}
                  </div>
                  <span className="text-xs font-medium text-zinc-700">
                    {comment.author}
                  </span>
                </div>
                <time className="text-[10px] text-zinc-400">
                  {formatTime(comment.createdAt)}
                </time>
              </div>
              <p className="text-sm leading-6 text-zinc-600">{comment.content}</p>
            </article>
          ))
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur-md"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            placeholder="写下你的留言..."
            rows={2}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-zinc-100 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-200"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
          >
            发送
          </button>
        </div>
        {error ? (
          <p className="mt-2 text-xs text-rose-500">{error}</p>
        ) : null}
      </form>
    </section>
  );
}
