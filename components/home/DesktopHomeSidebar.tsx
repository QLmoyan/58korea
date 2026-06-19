"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminCapabilitiesAction } from "@/lib/actions/admin-capabilities";
import { useAuthStore } from "@/lib/store/auth-store";

const mainNavItems = [
  { label: "首页", href: "/", icon: HomeIcon },
  { label: "发布", href: "/publish", icon: PlusIcon },
  { label: "广场", href: "/square", icon: SquareIcon },
  { label: "通知", href: "/messages", icon: BellIcon, placeholder: true },
  { label: "我的", href: "/profile", icon: UserIcon },
];

export default function DesktopHomeSidebar() {
  const pathname = usePathname();
  const { user, profile, loading } = useAuthStore();
  const [showAdminLink, setShowAdminLink] = useState(false);
  const displayName = profile?.nickname || profile?.username || "用户";

  useEffect(() => {
    let cancelled = false;

    async function loadAdminCapabilities() {
      try {
        const capabilities = await getAdminCapabilitiesAction();
        if (!cancelled) {
          setShowAdminLink(capabilities.isAdmin);
        }
      } catch {
        if (!cancelled) {
          setShowAdminLink(false);
        }
      }
    }

    loadAdminCapabilities();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-[220px] flex-col border-r border-zinc-100 bg-white px-4 py-6">
      <Link href="/" className="mb-8 px-2">
        <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          58韩国
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {mainNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-rose-50 text-rose-600"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <item.icon
                className={`h-5 w-5 ${isActive ? "text-rose-500" : "text-zinc-500"}`}
              />
              <span>{item.label}</span>
              {item.placeholder ? (
                <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-400">
                  占位
                </span>
              ) : null}
            </Link>
          );
        })}

        {showAdminLink ? (
          <Link
            href="/admin"
            className={`mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin")
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            }`}
          >
            <AdminIcon
              className={`h-5 w-5 ${pathname.startsWith("/admin") ? "text-white" : "text-zinc-500"}`}
            />
            <span>管理</span>
          </Link>
        ) : null}
      </nav>

      <div className="mt-auto border-t border-zinc-100 pt-4">
        {loading ? (
          <p className="px-3 text-xs text-zinc-400">加载中...</p>
        ) : user ? (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-xs font-bold text-white">
              {displayName.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-800">
                {displayName}
              </p>
              <p className="text-[11px] text-zinc-400">已登录</p>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-xl bg-rose-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
          >
            <LoginIcon className="h-5 w-5" />
            <span>登录</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SquareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function LoginIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
      />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
