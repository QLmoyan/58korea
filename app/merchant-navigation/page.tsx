"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { getMerchantDisplayName } from "@/lib/merchant/identify";

function MerchantNavigationContent() {
  const searchParams = useSearchParams();
  const [toast, setToast] = useState("");

  const merchant =
    searchParams.get("merchant")?.trim() || getMerchantDisplayName();
  const location = searchParams.get("location")?.trim() || "未知位置";

  function showComingSoon(label: string) {
    setToast(`${label}：功能开发中`);
    window.setTimeout(() => {
      setToast((current) =>
        current === `${label}：功能开发中` ? "" : current,
      );
    }, 2000);
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-8">
      <PageHeader title="商家导航" backHref="/" />

      <main className="px-4 pt-20">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">认证商家</p>
            <h1 className="text-2xl font-bold text-zinc-900">{merchant}</h1>
          </div>

          <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3">
            <p className="text-xs font-medium text-zinc-400">位置</p>
            <p className="mt-1 text-sm leading-6 text-zinc-700">{location}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => showComingSoon("导航")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-200 transition-transform active:scale-[0.98]"
            >
              <span aria-hidden="true">🧭</span>
              导航
            </button>

            <button
              type="button"
              onClick={() => showComingSoon("打车")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-transform active:scale-[0.98]"
            >
              <span aria-hidden="true">🚕</span>
              打车
            </button>

            <button
              type="button"
              onClick={() => showComingSoon("公交")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-transform active:scale-[0.98]"
            >
              <span aria-hidden="true">🚌</span>
              公交
            </button>
          </div>

          {toast ? (
            <p className="mt-4 rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm text-white">
              {toast}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default function MerchantNavigationPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen max-w-md bg-zinc-50">
          <PageHeader title="商家导航" backHref="/" />
          <div className="flex h-[60vh] items-center justify-center pt-14">
            <p className="text-sm text-zinc-400">加载中...</p>
          </div>
        </div>
      }
    >
      <MerchantNavigationContent />
    </Suspense>
  );
}
