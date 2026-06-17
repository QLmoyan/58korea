import type { FeedChannel, Post } from "@/lib/data/posts";
import PostCard from "./PostCard";

interface PostFeedProps {
  posts: Post[];
  channel: FeedChannel;
}

export default function PostFeed({ posts, channel }: PostFeedProps) {
  if (posts.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">
          {channel === "关注"
            ? "还没有关注的内容，去发现更多吧"
            : channel === "附近"
              ? "附近暂无相关内容"
              : "该分类下暂无内容"}
        </p>
      </section>
    );
  }

  return (
    <section className="px-2 pt-2 pb-4">
      <div className="columns-2 gap-2.5 [&>*]:inline-block [&>*]:w-full">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
