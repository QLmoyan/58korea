import type { PostCategory } from "@/lib/data/posts";
import { categories } from "@/lib/data/posts";

interface CategoryScrollProps {
  active: PostCategory | null;
  onChange: (category: PostCategory | null) => void;
}

export default function CategoryScroll({
  active,
  onChange,
}: CategoryScrollProps) {
  return (
    <div className="border-b border-zinc-100 bg-zinc-50">
      <div className="scrollbar-hide mx-auto flex max-w-md gap-2 overflow-x-auto px-4 py-2.5 lg:max-w-none lg:flex-wrap lg:overflow-visible lg:px-6">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
            active === null
              ? "bg-rose-500 text-white shadow-sm"
              : "bg-white text-zinc-500 ring-1 ring-zinc-200"
          }`}
        >
          全部
        </button>
        {categories.map((category) => {
          const isActive = active === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onChange(category)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                isActive
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-white text-zinc-500 ring-1 ring-zinc-200"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
