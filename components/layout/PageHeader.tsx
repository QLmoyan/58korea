"use client";

import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  backHref = "/",
  action,
}: PageHeaderProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-3">
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
          aria-label="返回"
        >
          <BackIcon />
        </Link>
        <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
        <div className="flex h-9 min-w-9 items-center justify-end">{action}</div>
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
