"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { usePostStore } from "@/lib/store/post-store";
import {
  publishCategories,
  type PublishCategory,
} from "@/lib/types/community";

export default function PublishForm() {
  const router = useRouter();
  const { addPost } = usePostStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PublishCategory>("租房");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("请填写标题");
      return;
    }

    if (!content.trim()) {
      setError("请填写内容");
      return;
    }

    try {
      await addPost({ title, content, category });
      router.push("/");
    } catch {
      setError("发布失败，请检查 Supabase 配置后重试");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-8">
      <PageHeader title="发布帖子" backHref="/" />

      <main className="px-4 pt-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              标题
            </label>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="请输入帖子标题"
              className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300"
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              分类
            </label>
            <div className="flex flex-wrap gap-2">
              {publishCategories.map((item) => {
                const isActive = category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              内容
            </label>
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setError("");
              }}
              placeholder="分享你的租房、招聘、攻略或求助信息..."
              rows={8}
              className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300"
            />
          </section>

          {error ? (
            <p className="text-center text-sm text-rose-500">{error}</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98]"
          >
            发布
          </button>
        </form>
      </main>
    </div>
  );
}
