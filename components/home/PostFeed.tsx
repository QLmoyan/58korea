import type { FeedChannel, Post } from "@/lib/data/posts";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import PostCard from "./PostCard";

interface PostFeedProps {
  posts: Post[];
  channel?: FeedChannel;
  emptyMessage?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  highlightQuery?: string;
}

function getDefaultEmptyMessage(channel: FeedChannel) {
  if (channel === "关注") {
    return "还没有关注的内容，去发现更多吧";
  }

  if (channel === "附近") {
    return "附近暂无相关内容";
  }

  return "该分类下暂无内容";
}

export default function PostFeed({
  posts,
  channel = "推荐",
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
