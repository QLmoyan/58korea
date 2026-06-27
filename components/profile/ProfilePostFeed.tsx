import type { Post } from "@/lib/data/posts";
import ProfilePostCard from "@/components/profile/ProfilePostCard";

interface ProfilePostFeedProps {
  posts: Post[];
  emptyMessage?: string;
  loading?: boolean;
  showAuthor?: boolean;
}

export default function ProfilePostFeed({
  posts,
  emptyMessage = "暂无帖子",
  loading = false,
  showAuthor = false,
}: ProfilePostFeedProps) {
  if (loading) {
    return (
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-400">加载中...</p>
      </section>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="px-2 pb-2 lg:px-4 lg:pb-4">
      <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2.5 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4">
        {posts.map((post) => (
          <ProfilePostCard
            key={post.id}
            post={post}
            showAuthor={showAuthor}
          />
        ))}
      </div>
    </section>
  );
}
