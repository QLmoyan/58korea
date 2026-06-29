"use client";

import { useMemo, useState } from "react";
import {
  filterPosts,
  type FeedChannel,
  type PostCategory,
} from "@/lib/data/posts";
import { FEED_UI_DEADLINE_MS } from "@/lib/constants/network";
import { useSelectedRegion } from "@/lib/feed/use-selected-region";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { usePostStore } from "@/lib/store/post-store";
import CategoryScroll from "./CategoryScroll";
import ChannelTabs from "./ChannelTabs";
import HomeSearchBar from "./HomeSearchBar";
import PostFeed from "./PostFeed";
import RegionSelector from "./RegionSelector";

export default function HomeFeed() {
  const { posts, hydrated, feedError, reloadFeed } = usePostStore();
  const [channel, setChannel] = useState<FeedChannel>("推荐");
  const [category, setCategory] = useState<PostCategory | null>(null);
  const { region, setSelectedRegion } = useSelectedRegion();
  const loading = !hydrated;
  const loadingOverdue = useLoadingDeadline(loading, FEED_UI_DEADLINE_MS);

  const filteredPosts = useMemo(
    () => filterPosts(posts, channel, category, region),
    [posts, channel, category, region],
  );

  const displayError =
    feedError ??
    (loadingOverdue ? "帖子加载超时，请检查网络后重试" : null);

  function handleChannelChange(nextChannel: FeedChannel) {
    setChannel(nextChannel);
    setCategory(null);
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white lg:rounded-2xl lg:bg-white/95 lg:shadow-sm lg:ring-1 lg:ring-zinc-100 lg:backdrop-blur-md">
        <div className="border-b border-zinc-100 px-3 py-2 lg:hidden">
          <HomeSearchBar variant="mobile" />
        </div>
        <div className="border-b border-zinc-100 lg:px-4 lg:py-2">
          <ChannelTabs active={channel} onChange={handleChannelChange} />
        </div>
        {channel === "附近" ? (
          <RegionSelector active={region} onChange={setSelectedRegion} />
        ) : null}
        <CategoryScroll active={category} onChange={setCategory} />
      </header>
      <PostFeed
        posts={filteredPosts}
        channel={channel}
        selectedRegion={region}
        loading={loading && !displayError}
        error={displayError}
        onRetry={reloadFeed}
      />
    </>
  );
}
