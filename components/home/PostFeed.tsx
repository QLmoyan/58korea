import Link from "next/link";
import type { FeedChannel, Post } from "@/lib/data/posts";
import type { SelectedRegion } from "@/lib/feed/regions";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import PostCard from "./PostCard";

interface PostFeedProps {
  posts: Post[];
  channel?: FeedChannel;
  selectedRegion?: SelectedRegion;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  highlightQuery?: string;
}

function getDefaultEmptyMessage(channel: FeedChannel) {
  if (channel === "最新") {
    return "暂无最新内容";
  }

  if (channel === "附近") {
    return "当前地区还没有帖子";
  }

  return "该分类下暂无内容";
}

function NearbyEmptyState({ region }: { region: SelectedRegion }) {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-zinc-600">当前地区还没有帖子</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {region} 暂无匹配内容，可在上方换个地区看看
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/publish"
          className="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white shadow-sm"
        >
          发布一条
        </Link>
      </div>
    </section>
  );
}

export default function PostFeed({
  posts,
  channel = "推荐",
  selectedRegion = "首尔",
  emptyMessage,
  loading = false,
  error = null,
  onRetry,
  highlightQuery,
}: PostFeedProps) {
  if (loading) {
    return <AsyncStatePanel message="加载中..." />;
  }

  if (error) {
    return (
      <AsyncStatePanel
        message={error}
        tone="error"
        onRetry={onRetry}
      />
    );
  }

  if (posts.length === 0) {
    if (channel === "附近") {
      return <NearbyEmptyState region={selectedRegion} />;
    }

    return (
      <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">
          {emptyMessage ?? getDefaultEmptyMessage(channel)}
        </p>
      </section>
    );
  }

  return (
    <section className="px-2 pt-2 pb-4 lg:px-0 lg:pt-4 lg:pb-8">
      <div className="columns-2 gap-2.5 lg:columns-3 lg:gap-4 xl:columns-3 xl:gap-5 [&>*]:inline-block [&>*]:w-full">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} highlightQuery={highlightQuery} />
        ))}
      </div>
    </section>
  );
}
