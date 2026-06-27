import type { Comment } from "@/lib/types/community";

interface ProfileCommentsListProps {
  comments: Comment[];
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

export default function ProfileCommentsList({
  comments,
}: ProfileCommentsListProps) {
  if (comments.length === 0) {
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
    <section className="divide-y divide-zinc-100 px-4 py-2">
      {comments.map((comment) => (
        <article key={comment.id} className="py-4">
          <p className="text-sm leading-6 text-zinc-700">{comment.content}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {formatTime(comment.createdAt)}
          </p>
        </article>
      ))}
    </section>
  );
}
