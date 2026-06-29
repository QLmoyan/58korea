interface ProfileStatsProps {
  postCount: number;
  likeCount: number;
  favoriteCount: number | string;
  layout?: "mobile" | "desktop";
}

export default function ProfileStats({
  postCount,
  likeCount,
  favoriteCount,
  layout = "mobile",
}: ProfileStatsProps) {
  const isDesktop = layout === "desktop";

  return (
    <section
      className={
        isDesktop
          ? "mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100"
          : "grid grid-cols-3 gap-2 border-b border-zinc-100 bg-white px-3 py-4"
      }
    >
      <StatItem label="帖子" value={postCount} />
      <StatItem label="获赞" value={likeCount} />
      <StatItem label="收藏" value={favoriteCount} muted={favoriteCount === "—"} />
    </section>
  );
}

function StatItem({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-lg font-bold leading-none ${
          muted ? "text-zinc-400" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
