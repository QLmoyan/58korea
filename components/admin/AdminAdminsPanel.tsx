"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listAdminUsersAction,
  type AdminUserListItem,
} from "@/lib/actions/admin-admins";
import { useAdminCapabilities } from "@/components/admin/AdminCapabilitiesProvider";

export default function AdminAdminsPanel() {
  const { permissions } = useAdminCapabilities();
  const canManageAdmins = permissions.includes("admins.manage");
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canManageAdmins) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAdmins() {
      setLoading(true);
      setError("");

      try {
        const rows = await listAdminUsersAction();
        if (!cancelled) {
          setItems(rows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "加载管理员列表失败",
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAdmins();

    return () => {
      cancelled = true;
    };
  }, [canManageAdmins]);

  if (!canManageAdmins) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-100 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">无权限访问</h1>
        <p className="mt-2 text-sm text-zinc-500">
          仅站长（owner）可查看管理员列表。
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          返回运营后台
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">管理员管理</h1>
            <p className="mt-1 text-xs text-zinc-500">
              只读查看 admin_users 成员与角色权限摘要
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
          >
            返回运营后台
          </Link>
        </div>
      </header>

      <main className="space-y-4 px-4 py-4 lg:px-6 lg:py-6">
        <section className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          管理员变更请通过脚本或数据库操作，例如运行
          <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 text-xs">
            npx tsx scripts/create-admin-user.ts
          </code>
          ，或直接维护 <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">admin_users</code>{" "}
          表。本页不提供新增、删除或启用/停用操作。
        </section>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-400">加载中...</p>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-zinc-100 bg-white px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">暂无管理员记录</p>
            <p className="mt-2 text-xs text-zinc-400">
              请通过建站脚本初始化 admin_users
            </p>
          </section>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-100 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-zinc-900">
                        {item.nickname || item.accountLabel}
                      </h2>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {item.roleLabel}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          item.enabled
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {item.enabled ? "已启用" : "已停用"}
                      </span>
                    </div>

                    <dl className="mt-3 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                      <div>
                        <dt className="text-zinc-400">账号</dt>
                        <dd className="mt-0.5 font-medium text-zinc-700">
                          {item.username ? `@${item.username}` : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">用户 ID</dt>
                        <dd className="mt-0.5 break-all font-mono text-[11px] text-zinc-600">
                          {item.userId}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">创建时间</dt>
                        <dd className="mt-0.5 text-zinc-700">{item.createdAt}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">最近更新</dt>
                        <dd className="mt-0.5 text-zinc-700">{item.updatedAt}</dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-xs leading-5 text-zinc-500">
                      <span className="font-medium text-zinc-600">权限摘要：</span>
                      {item.permissionSummary}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
