"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthField from "@/components/auth/AuthField";
import PageHeader from "@/components/layout/PageHeader";
import { validateUsername } from "@/lib/auth/username";
import { useAuthStore } from "@/lib/store/auth-store";

export default function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    if (nickname.trim().length < 2) {
      setError("昵称至少 2 个字符");
      return;
    }

    if (bio.trim().length > 200) {
      setError("个人介绍最多 200 字");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await signUp({ username, password, nickname, bio });
      router.push("/profile");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "注册失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-8">
      <PageHeader title="注册" backHref="/profile" />

      <main className="px-4 pt-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <AuthField
              label="账号"
              value={username}
              placeholder="4-20 位字母、数字或下划线"
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
              placeholder="至少 6 位密码"
              autoComplete="new-password"
              onChange={(value) => {
                setPassword(value);
                setError("");
              }}
            />
            <AuthField
              label="昵称"
              value={nickname}
              placeholder="请输入昵称"
              autoComplete="nickname"
              onChange={(value) => {
                setNickname(value);
                setError("");
              }}
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">
                个人介绍
                <span className="ml-1 text-xs font-normal text-zinc-400">
                  可选
                </span>
              </span>
              <textarea
                value={bio}
                placeholder="介绍一下自己..."
                rows={4}
                onChange={(event) => {
                  setBio(event.target.value);
                  setError("");
                }}
                className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300"
              />
            </label>
          </section>

          {error ? (
            <p className="text-center text-sm text-rose-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "注册中..." : "注册"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          已有账号？
          <Link href="/login" className="ml-1 font-medium text-rose-500">
            去登录
          </Link>
        </p>
      </main>
    </div>
  );
}
