"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdminAction } from "@/lib/actions/admin-auth";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await loginAdminAction(password);
      const nextPath = searchParams.get("next") || "/admin";
      router.replace(nextPath);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "登录失败，请重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-zinc-50 px-4">
      <div className="w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
        <h1 className="text-lg font-semibold text-zinc-900">韩圈运营后台</h1>
        <p className="mt-1 text-sm text-zinc-500">请输入后台密码登录</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="后台密码"
            className="w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-200"
          />

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !password.trim()}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {submitting ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
