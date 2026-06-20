"use client";

import { useMemo, useState } from "react";
import {
  filterPosts,
  type FeedChannel,
  type PostCategory,
} from "@/lib/data/posts";
import { usePostStore } from "@/lib/store/post-store";
import CategoryScroll from "./CategoryScroll";
import ChannelTabs from "./ChannelTabs";
import PostFeed from "./PostFeed";

export default function HomeFeed() {
  const { posts } = usePostStore();
  const [channel, setChannel] = useState<FeedChannel>("推荐");
  const [category, setCategory] = useState<PostCategory | null>(null);

  const filteredPosts = useMemo(
    () => filterPosts(posts, channel, category),
    [posts, channel, category],
  );

  function handleChannelChange(nextChannel: FeedChannel) {
    setChannel(nextChannel);
    setCategory(null);
  }

  return (
    <>
      <div className="sticky top-[7rem] z-40 bg-white/95 backdrop-blur-md lg:top-0 lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
        <div className="border-b border-zinc-100 bg-white lg:px-4 lg:py-2">
          <ChannelTabs active={channel} onChange={handleChannelChange} />
        </div>
        <CategoryScroll active={category} onChange={setCategory} />
      </div>
      <PostFeed posts={filteredPosts} channel={channel} />
    </>
  );
}
