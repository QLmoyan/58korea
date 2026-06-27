"use client";

import { useState } from "react";
import AuthField from "@/components/auth/AuthField";
import { changePasswordAction } from "@/lib/actions/change-password";

export default function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("密码至少 6 位");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }

    setSubmitting(true);

    try {
      await changePasswordAction({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("密码已更新，当前设备可继续使用；其他设备下次登录请使用新密码。");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "密码修改失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
      <h2 className="text-sm font-semibold text-zinc-900">修改密码</h2>
      <p className="mt-1 text-xs text-zinc-500">
        需验证当前密码。忘记密码请前往登录页的「忘记密码？」说明。
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <AuthField
          label="当前密码"
          type="password"
          value={currentPassword}
          placeholder="请输入当前密码"
          autoComplete="current-password"
          onChange={(value) => {
            setCurrentPassword(value);
            setError("");
            setSuccess("");
          }}
        />
        <AuthField
          label="新密码"
          type="password"
          value={newPassword}
          placeholder="至少 6 位密码"
          autoComplete="new-password"
          onChange={(value) => {
            setNewPassword(value);
            setError("");
            setSuccess("");
          }}
        />
        <AuthField
          label="确认新密码"
          type="password"
          value={confirmPassword}
          placeholder="再次输入新密码"
          autoComplete="new-password"
          onChange={(value) => {
            setConfirmPassword(value);
            setError("");
            setSuccess("");
          }}
        />

        {error ? <p className="text-center text-sm text-rose-500">{error}</p> : null}
        {success ? (
          <p className="text-center text-sm text-emerald-600">{success}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full border border-zinc-200 bg-white py-3 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-60"
        >
          {submitting ? "更新中..." : "更新密码"}
        </button>
      </form>
    </section>
  );
}
