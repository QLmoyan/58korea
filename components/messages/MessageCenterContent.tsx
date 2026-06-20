"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import MessageListItem from "@/components/messages/MessageListItem";
import MessageLoginPrompt from "@/components/messages/MessageLoginPrompt";
import MessageTabs from "@/components/messages/MessageTabs";
import { MESSAGE_EMPTY_TAB } from "@/lib/messages/constants";
import { getMockMessagesByTab } from "@/lib/messages/mock-messages";
import type { MessageTabId } from "@/lib/messages/types";
import { useAuthStore } from "@/lib/store/auth-store";

function MessagePanel({ showBackButton = false }: { showBackButton?: boolean }) {
  const { user, loading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MessageTabId>("comment");

  const items = useMemo(() => {
    if (!user) {
      return [];
    }

    return getMockMessagesByTab(activeTab);
  }, [activeTab, user]);

  return (
    <div className="min-h-[60vh] rounded-2xl bg-white lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <div className="border-b border-zinc-100 px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
              aria-label="返回"
            >
              <BackIcon />
            </Link>
          ) : null}
          <h1 className="text-lg font-semibold text-zinc-900">消息</h1>
        </div>
      </div>

      <MessageTabs activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm text-zinc-400">加载中...</p>
        </section>
      ) : !user ? (
        <MessageLoginPrompt />
      ) : items.length === 0 ? (
        <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm font-medium text-zinc-500">{MESSAGE_EMPTY_TAB}</p>
        </section>
      ) : (
        <div className="divide-y divide-zinc-100 lg:px-6">
          {items.map((item) => (
            <MessageListItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MessageCenterContent() {
  return (
    <>
      <div className="relative mx-auto min-h-screen max-w-md bg-zinc-50 pb-24 lg:hidden">
        <MessagePanel showBackButton />
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 pl-[220px] pr-[280px] lg:block">
        <DesktopHomeSidebar />
        <DesktopHomeAside />
        <main className="mx-auto w-full max-w-[920px] px-6 py-6">
          <MessagePanel />
        </main>
      </div>
    </>
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
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
