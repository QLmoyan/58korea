"use client";

import { MESSAGE_TABS } from "@/lib/messages/constants";
import type { MessageTabId } from "@/lib/messages/types";

interface MessageTabsProps {
  activeTab: MessageTabId;
  onChange: (tab: MessageTabId) => void;
}

export default function MessageTabs({ activeTab, onChange }: MessageTabsProps) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-zinc-100 px-4 scrollbar-hide lg:px-0">
      {MESSAGE_TABS.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative shrink-0 pb-3 text-sm font-medium transition-colors ${
              isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {tab.label}
            {isActive ? (
              <span className="absolute right-0 bottom-0 left-0 mx-auto h-0.5 w-5 rounded-full bg-rose-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
