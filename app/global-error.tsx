"use client";

import { useEffect } from "react";
import { SITE_NAME } from "@/lib/share/constants";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 antialiased">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-zinc-100">
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
              className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200"
            >
              重试
            </button>
            <a
              href="/"
              className="flex w-full items-center justify-center rounded-full bg-zinc-100 py-3.5 text-sm font-medium text-zinc-700 no-underline"
            >
              返回首页
            </a>
          </div>

          <p className="mt-6 text-xs text-zinc-400">{SITE_NAME}</p>
        </section>
      </body>
    </html>
  );
}
