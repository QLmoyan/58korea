"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthField from "@/components/auth/AuthField";
import PageHeader from "@/components/layout/PageHeader";
import { buildRegisterHref, resolveRedirectTarget } from "@/lib/auth/redirect";
import { validateUsername } from "@/lib/auth/username";
import { useAuthStore } from "@/lib/store/auth-store";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (!password) {
      setError("请填写密码");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await signIn({ username, password });
      router.push(redirectTarget);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "登录失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-32 pb-safe">
      <PageHeader title="登录" backHref="/profile" />

      <main className="px-4 pt-20">
        <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <AuthField
              label="账号"
              value={username}
              placeholder="请输入账号"
              autoComplete="username"
              onChange={(value) => {
                setUsername(value);
                setError("");
              }}
            />
            <AuthField
              label="密码"
              type="password"
              value={password}
              placeholder="请输入密码"
              autoComplete="current-password"
              onChange={(value) => {
                setPassword(value);
                setError("");
              }}
            />
          </section>

          <p className="text-right text-sm">
            <Link href="/forgot-password" className="font-medium text-rose-500">
              忘记密码？
            </Link>
          </p>

          {error ? (
            <p className="text-center text-sm text-rose-500">{error}</p>
          ) : null}
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          还没有账号？
          <Link
            href={buildRegisterHref(searchParams.get("redirect"))}
            className="ml-1 font-medium text-rose-500"
          >
            去注册
          </Link>
        </p>
      </main>

      <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-zinc-100 bg-white/95 backdrop-blur-md pb-safe">
        <div className="mx-auto max-w-md px-4 py-3">
          <button
            type="submit"
            form="login-form"
            disabled={submitting}
            className="min-h-12 w-full touch-manipulation rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "登录中..." : "登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
