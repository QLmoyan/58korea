import ProfileHistoryPostCard from "@/components/profile/ProfileHistoryPostCard";
import { groupHistoryEntries } from "@/lib/profile/history-groups";
import type { ViewedPostEntry } from "@/lib/supabase/view-queries";

interface ProfileHistoryFeedProps {
  entries: ViewedPostEntry[];
  emptyMessage?: string;
  loading?: boolean;
}

export default function ProfileHistoryFeed({
  entries,
  emptyMessage = "你还没有浏览记录",
  loading = false,
}: ProfileHistoryFeedProps) {
  if (loading) {
    return (
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm text-zinc-400">加载中...</p>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  const groups = groupHistoryEntries(entries);

  return (
    <section className="space-y-5 px-2 pb-2 lg:px-4 lg:pb-4">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="mb-2.5 px-1 text-sm font-semibold text-zinc-800">
            {group.label}
          </h3>
          <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-2.5 lg:grid-cols-3 lg:gap-3 xl:grid-cols-4">
            {group.items.map((entry) => (
              <ProfileHistoryPostCard key={entry.post.id} post={entry.post} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
