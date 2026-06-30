"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMerchantApplyUiStateAction } from "@/lib/actions/merchant-application";
import type { MerchantApplyUiState } from "@/lib/types/merchant-application";

export default function MerchantApplySection() {
  const [state, setState] = useState<MerchantApplyUiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const next = await getMerchantApplyUiStateAction();
        if (!cancelled) {
          setState(next);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-3 mb-4 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-400 shadow-sm ring-1 ring-zinc-100 lg:mx-0">
        商家认证状态加载中...
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-3 mb-4 rounded-2xl bg-white px-4 py-3 text-sm text-rose-500 shadow-sm ring-1 ring-zinc-100 lg:mx-0">
        {error}
      </section>
    );
  }

  if (!state) {
    return null;
  }

  if (state.kind === "verified") {
    return (
      <section className="mx-3 mb-4 rounded-2xl bg-amber-50 px-4 py-3 shadow-sm ring-1 ring-amber-100 lg:mx-0">
        <p className="text-sm font-medium text-amber-900">认证商家</p>
        <p className="mt-1 text-xs text-amber-700">
          店铺「{state.businessName}」已通过平台认证
        </p>
      </section>
    );
  }

  if (state.kind === "pending") {
    return (
      <section className="mx-3 mb-4 rounded-2xl bg-sky-50 px-4 py-3 shadow-sm ring-1 ring-sky-100 lg:mx-0">
        <p className="text-sm font-medium text-sky-900">商家认证审核中</p>
        <p className="mt-1 text-xs text-sky-700">
          店铺「{state.application.businessName}」正在人工审核，请耐心等待
        </p>
      </section>
    );
  }

  if (state.kind === "rejected") {
    return (
      <section className="mx-3 mb-4 rounded-2xl bg-rose-50 px-4 py-3 shadow-sm ring-1 ring-rose-100 lg:mx-0">
        <p className="text-sm font-medium text-rose-900">商家认证未通过</p>
        <p className="mt-1 text-xs text-rose-700">
          原因：{state.application.rejectReason || "未说明"}
        </p>
        <Link
          href="/merchant/apply"
          className="mt-3 inline-flex rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-rose-600"
        >
          重新提交申请
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-3 mb-4 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-100 lg:mx-0">
      <p className="text-sm font-medium text-zinc-900">申请商家认证</p>
      <p className="mt-1 text-xs text-zinc-500">
        提交店铺资料，平台人工审核通过后即可开通认证商家身份
      </p>
      <Link
        href="/merchant/apply"
        className="mt-3 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
      >
        申请商家认证
      </Link>
    </section>
  );
}
