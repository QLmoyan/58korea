import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `页面走丢了｜${SITE_NAME}`,
};

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-zinc-50 px-6 pb-safe">
      <section className="w-full rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl">
          🧭
        </div>
        <h1 className="mt-4 text-lg font-semibold text-zinc-900">页面走丢了</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          你访问的内容可能已删除、下架，或链接地址有误
        </p>

        <div className="mt-6 space-y-3">
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200"
          >
            返回首页
          </Link>
          <Link
            href="/square"
            className="flex w-full items-center justify-center rounded-full bg-zinc-100 py-3.5 text-sm font-medium text-zinc-700"
          >
            去发现
          </Link>
        </div>
      </section>
    </div>
  );
}
