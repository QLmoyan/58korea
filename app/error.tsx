"use client";

import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center bg-zinc-50 px-6 pb-safe">
      <section className="w-full rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-100">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl">
          ⚠️
        </div>
        <h1 className="mt-4 text-lg font-semibold text-zinc-900">
          页面暂时无法打开
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          可能是网络波动或页面加载异常，请稍后再试
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={reset}
            className="flex w-full touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200"
          >
            重试
          </button>
          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-full bg-zinc-100 py-3.5 text-sm font-medium text-zinc-700"
          >
            返回首页
          </Link>
        </div>
      </section>
    </div>
  );
}
