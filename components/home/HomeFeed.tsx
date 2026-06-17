"use client";

import { useMemo, useState } from "react";
import {
  filterPosts,
  type FeedChannel,
  type PostCategory,
} from "@/lib/data/posts";
import CategoryScroll from "./CategoryScroll";
import ChannelTabs from "./ChannelTabs";
import PostFeed from "./PostFeed";

export default function HomeFeed() {
  const [channel, setChannel] = useState<FeedChannel>("推荐");
  const [category, setCategory] = useState<PostCategory | null>(null);

  const filteredPosts = useMemo(
    () => filterPosts(channel, category),
    [channel, category],
  );

  function handleChannelChange(nextChannel: FeedChannel) {
    setChannel(nextChannel);
    setCategory(null);
  }

  return (
    <>
      <div className="sticky top-14 z-40 bg-white/95 backdrop-blur-md">
        <ChannelTabs active={channel} onChange={handleChannelChange} />
        <CategoryScroll active={category} onChange={setCategory} />
      </div>
      <PostFeed posts={filteredPosts} channel={channel} />
    </>
  );
}
