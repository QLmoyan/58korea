"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/lib/data/posts";
import type { DiscoveryNewsArticleItem } from "@/lib/types/channel-articles";
import { fetchPostCommentCounts } from "@/lib/square/fetch-post-comment-counts";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import SquareNearbyRecommendStrip from "./SquareNearbyRecommendStrip";
import SquareNewsArticleListItem from "./SquareNewsArticleListItem";
import SquarePostListItem from "./SquarePostListItem";
import { SQUARE_LIST_INSERT_AFTER } from "@/lib/square/nearby-recommend-posts";

interface SquarePostListProps {
  posts: Post[];
  newsArticles?: DiscoveryNewsArticleItem[];
  nearbyRecommendPosts?: Post[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
}

export default function SquarePostList({
  posts,
  newsArticles = [],
  nearbyRecommendPosts = [],
  loading = false,
  error = null,
  onRetry,
  emptyMessage = "暂无帖子",
}: SquarePostListProps) {
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    let cancelled = false;
    const postIds = posts.map((post) => post.id);

    void fetchPostCommentCounts(postIds).then((counts) => {
      if (!cancelled) {
        setCommentCounts(counts);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [posts]);

  if (loading) {
    return <AsyncStatePanel message="加载中..." />;
  }

  if (error) {
    return (
      <AsyncStatePanel message={error} tone="error" onRetry={onRetry} />
    );
  }

  if (posts.length === 0 && newsArticles.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  const headPosts = posts.slice(0, SQUARE_LIST_INSERT_AFTER);
  const tailPosts = posts.slice(SQUARE_LIST_INSERT_AFTER);
  const showNearbyStrip = nearbyRecommendPosts.length > 0 && posts.length > 0;

  return (
    <section className="divide-y divide-zinc-100 bg-white" data-testid="square-post-list">
      {newsArticles.map((article) => (
        <SquareNewsArticleListItem key={article.id} article={article} />
      ))}

      {headPosts.map((post) => (
        <SquarePostListItem
          key={post.id}
          post={post}
          commentCount={commentCounts[post.id] ?? 0}
        />
      ))}

      {showNearbyStrip ? (
        <SquareNearbyRecommendStrip posts={nearbyRecommendPosts} />
      ) : null}

      {tailPosts.map((post) => (
        <SquarePostListItem
          key={post.id}
          post={post}
          commentCount={commentCounts[post.id] ?? 0}
        />
      ))}
    </section>
  );
}
