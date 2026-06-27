"use client";

import { MESSAGE_TABS } from "@/lib/messages/constants";
import { getUnreadCountForTab } from "@/lib/messages/unread-counts";
import type { NotificationUnreadCounts } from "@/lib/messages/unread-counts";
import type { MessageTabId } from "@/lib/messages/types";

interface MessageTabsProps {
  activeTab: MessageTabId;
  unreadCounts: NotificationUnreadCounts;
  onChange: (tab: MessageTabId) => void;
}

function formatUnreadBadge(count: number) {
  if (count <= 0) {
    return null;
  }

  return count > 99 ? "99+" : String(count);
}

export default function MessageTabs({
  activeTab,
  unreadCounts,
  onChange,
}: MessageTabsProps) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-zinc-100 px-4 scrollbar-hide lg:px-0">
      {MESSAGE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const unreadCount = getUnreadCountForTab(unreadCounts, tab.id);
        const badge = formatUnreadBadge(unreadCount);

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 pb-3 text-sm font-medium transition-colors ${
              isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {badge ? (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </span>
            {isActive ? (
              <span className="absolute right-0 bottom-0 left-0 mx-auto h-0.5 w-5 rounded-full bg-rose-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
