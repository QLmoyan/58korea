"use client";

import { useMemo } from "react";
import Link from "next/link";
import SquarePostList from "@/components/square/SquarePostList";
import { FEED_UI_DEADLINE_MS } from "@/lib/constants/network";
import type { DiscoveryNewsArticleItem } from "@/lib/types/channel-articles";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import {
  filterPostsForDiscoveryTab,
  getDiscoveryTabEmptyMessage,
  type DiscoveryCategoryTabId,
} from "@/lib/square/discovery-category-tabs";
import { pickNearbyRecommendPosts } from "@/lib/square/nearby-recommend-posts";
import { usePostStore } from "@/lib/store/post-store";

const SQUARE_FEED_LIMIT = 12;

interface SquareRecommendedFeedProps {
  categoryTab?: DiscoveryCategoryTabId;
  newsArticles?: DiscoveryNewsArticleItem[];
}

export default function SquareRecommendedFeed({
  categoryTab = "all",
  newsArticles = [],
}: SquareRecommendedFeedProps) {
  const { posts, hydrated, feedError, reloadFeed } = usePostStore();
  const loading = !hydrated;
  const loadingOverdue = useLoadingDeadline(loading, FEED_UI_DEADLINE_MS);

  const filteredPosts = useMemo(
    () => filterPostsForDiscoveryTab(posts, categoryTab),
    [posts, categoryTab],
  );

  const recommendedPosts = useMemo(
    () => filteredPosts.slice(0, SQUARE_FEED_LIMIT),
    [filteredPosts],
  );

  const nearbyRecommendPosts = useMemo(
    () => pickNearbyRecommendPosts(filteredPosts, recommendedPosts),
    [filteredPosts, recommendedPosts],
  );

  const discoveryNewsArticles = useMemo(
    () => (categoryTab === "news" ? newsArticles : []),
    [categoryTab, newsArticles],
  );

  const sectionTitle =
    categoryTab === "news" ? "新闻内容" : "推荐帖子";

  const displayError =
    feedError ??
    (loadingOverdue ? "帖子加载超时，请检查网络后重试" : null);

  const emptyMessage = getDiscoveryTabEmptyMessage(
    categoryTab,
    discoveryNewsArticles.length > 0,
  );

  return (
    <section className="bg-white" data-testid="square-recommended-feed">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5 lg:px-0">
        <h2 className="text-sm font-semibold text-zinc-900">{sectionTitle}</h2>
        <Link href="/" className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-rose-500">
          去首页
        </Link>
      </div>

      <SquarePostList
        posts={recommendedPosts}
        newsArticles={discoveryNewsArticles}
        nearbyRecommendPosts={nearbyRecommendPosts}
        loading={loading}
        error={displayError}
        onRetry={() => void reloadFeed()}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}
