"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { CLIENT_FETCH_TIMEOUT_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import {
  fetchUserProfileComments,
  PROFILE_COMMENTS_PAGE_SIZE,
  type ProfileCommentEntry,
} from "@/lib/supabase/profile-comment-queries";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

interface ProfileCommentsListProps {
  userId: string;
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

function CommentRow({ entry }: { entry: ProfileCommentEntry }) {
  const { comment, post } = entry;

  return (
    <article className="py-4">
      {post ? (
        <Link
          href={`/posts/${post.id}`}
          className="mb-2 block text-xs font-medium text-rose-500 hover:text-rose-600"
        >
          {post.title}
        </Link>
      ) : (
        <p className="mb-2 text-xs font-medium text-zinc-400">原帖已删除</p>
      )}

      <p className="text-sm leading-6 text-zinc-700">{comment.content}</p>
      <p className="mt-2 text-xs text-zinc-400">{formatTime(comment.createdAt)}</p>
    </article>
  );
}

export default function ProfileCommentsList({ userId }: ProfileCommentsListProps) {
  const [entries, setEntries] = useState<ProfileCommentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await withTimeout(
        fetchUserProfileComments({ userId, offset: 0 }),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载评论超时，请检查网络后重试",
      );
      setEntries(result.entries);
      setHasMore(result.hasMore);
    } catch (loadError) {
      logClientError("profile.comments", loadError, { userId });
      setError(
        loadError instanceof Error ? loadError.message : "加载评论失败",
      );
      setEntries([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial, loadAttempt]);

  async function handleLoadMore() {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const result = await withTimeout(
        fetchUserProfileComments({
          userId,
          offset: entries.length,
        }),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载更多评论超时，请检查网络后重试",
      );
      setEntries((current) => [...current, ...result.entries]);
      setHasMore(result.hasMore);
    } catch (loadError) {
      logClientError("profile.comments.loadMore", loadError, {
        userId,
        offset: entries.length,
      });
      setError(
        loadError instanceof Error
          ? loadError.message
          : "加载更多评论失败",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const loadingOverdue = useLoadingDeadline(
    loading,
    CLIENT_FETCH_TIMEOUT_MS + 3_000,
  );
  const displayError =
    error ?? (loadingOverdue ? "加载评论超时，请检查网络后重试" : null);

  if (loading && !displayError) {
    return <AsyncStatePanel message="加载中..." />;
  }

  if (displayError && entries.length === 0) {
    return (
      <AsyncStatePanel
        message={displayError}
        tone="error"
        onRetry={() => setLoadAttempt((current) => current + 1)}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">还没有评论记录</p>
        <p className="mt-1 text-xs text-zinc-400">
          在帖子详情页留言后会显示在这里
        </p>
      </section>
    );
  }

  return (
    <section className="px-4 py-2">
      {displayError ? (
        <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
          {displayError}
        </div>
      ) : null}

      <div className="divide-y divide-zinc-100">
        {entries.map((entry) => (
          <CommentRow key={entry.comment.id} entry={entry} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={loadingMore}
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-60"
          >
            {loadingMore ? "加载中..." : "加载更多"}
          </button>
        </div>
      ) : entries.length >= PROFILE_COMMENTS_PAGE_SIZE ? (
        <p className="py-4 text-center text-xs text-zinc-400">没有更多评论了</p>
      ) : null}
    </section>
  );
}
