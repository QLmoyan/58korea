import { categories } from "@/lib/data/posts";

const hotCategories = categories.slice(0, 5);

export default function DesktopHomeAside() {
  return (
    <aside className="fixed top-0 right-0 z-40 h-screen w-[280px] overflow-y-auto border-l border-zinc-100 bg-zinc-50/60 px-5 py-6">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100/80">
        <h2 className="text-sm font-semibold text-zinc-900">热门分类</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {hotCategories.map((category) => (
            <span
              key={category}
              className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500 ring-1 ring-zinc-100"
            >
              {category}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100/80">
        <h2 className="text-sm font-semibold text-zinc-900">社区提示</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          发现房屋、攻略、二手与本地生活内容。请遵守社区规范，友善交流。
        </p>
      </section>
    </aside>
  );
}
