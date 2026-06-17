"use client";

import Link from "next/link";
import { useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import TopNav from "@/components/home/TopNav";
import { getDisplayUsername } from "@/lib/auth/username";
import { useAuthStore } from "@/lib/store/auth-store";

export default function ProfileContent() {
  const { user, profile, loading, signOut } = useAuthStore();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);
    setError("");

    try {
      await signOut();
    } catch (signOutError) {
      setError(
        signOutError instanceof Error ? signOutError.message : "退出失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const displayUsername = getDisplayUsername(user);

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-zinc-50 pb-24">
      <TopNav />
      <main className="px-4 pt-20 pb-6">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-sm text-zinc-400">加载中...</p>
          </div>
        ) : user ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xl font-bold text-white">
                {(profile?.nickname ?? displayUsername ?? "我").slice(0, 1)}
              </div>
              <h1 className="mt-4 text-lg font-semibold text-zinc-900">
                {profile?.nickname ?? "社区用户"}
              </h1>
              {displayUsername ? (
                <p className="mt-1 text-sm text-zinc-500">账号：{displayUsername}</p>
              ) : null}
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                已登录
              </span>
            </div>

            {!profile ? (
              <p className="mt-4 text-center text-xs text-zinc-400">
                资料加载失败，请退出后重新登录
              </p>
            ) : (
              <div className="mt-6 space-y-3 border-t border-zinc-100 pt-5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">昵称</span>
                  <span className="font-medium text-zinc-800">
                    {profile.nickname}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">账号</span>
                  <span className="truncate font-medium text-zinc-800">
                    {displayUsername || "—"}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={submitting}
              className="mt-6 w-full rounded-full bg-zinc-100 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 disabled:opacity-60"
            >
              {submitting ? "退出中..." : "退出登录"}
            </button>

            {error ? (
              <p className="mt-3 text-center text-xs text-rose-500">{error}</p>
            ) : null}
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-2xl text-zinc-400">
                🙂
              </div>
              <h1 className="mt-4 text-lg font-semibold text-zinc-900">
                欢迎来到 58韩国
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                登录后可管理个人资料，后续还会支持更多社区功能。
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="flex w-full items-center justify-center rounded-full bg-zinc-100 py-3.5 text-sm font-medium text-zinc-700"
              >
                注册
              </Link>
            </div>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
