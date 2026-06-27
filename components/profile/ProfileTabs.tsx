export type ProfileTab =
  | "posts"
  | "comments"
  | "favorites"
  | "history"
  | "coupons";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "帖子" },
  { id: "comments", label: "评论" },
  { id: "favorites", label: "收藏" },
  { id: "history", label: "浏览历史" },
  { id: "coupons", label: "优惠券" },
];

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

export default function ProfileTabs({ activeTab, onChange }: ProfileTabsProps) {
  return (
    <div className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 backdrop-blur-md lg:rounded-t-2xl">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative flex-1 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab.label}
              {isActive ? (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-rose-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
