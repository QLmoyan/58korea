"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "首页", href: "/", icon: HomeIcon },
  { label: "广场", href: "/square", icon: SquareIcon },
  { label: "发布", href: "/publish", icon: PlusIcon, highlight: true },
  { label: "消息", href: "/messages", icon: ChatIcon },
  { label: "我的", href: "/profile", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-auto fixed right-0 bottom-0 left-0 z-[100] border-t border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-md items-end justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex cursor-pointer touch-manipulation flex-col items-center justify-center gap-0.5 ${
                item.highlight ? "-mt-3 min-w-[56px]" : "min-h-11 flex-1 py-1"
              }`}
            >
              {item.highlight ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-200">
                  <item.icon className="h-6 w-6" />
                </span>
              ) : (
                <item.icon
                  className={`h-6 w-6 ${
                    isActive ? "text-zinc-900" : "text-zinc-400"
                  }`}
                />
              )}
              <span
                className={`text-[10px] ${
                  item.highlight
                    ? "mt-1 font-medium text-rose-500"
                    : isActive
                      ? "font-semibold text-zinc-900"
                      : "text-zinc-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
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
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.2-3.6C3.45 15.1 3 13.6 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
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
