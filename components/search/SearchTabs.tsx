"use client";

import type { SearchTabId } from "@/lib/search/types";
import { SEARCH_TABS } from "@/lib/search/constants";

interface SearchTabsProps {
  activeTab: SearchTabId;
  onChange?: (tab: SearchTabId) => void;
}

export default function SearchTabs({ activeTab, onChange }: SearchTabsProps) {
  return (
    <div className="flex gap-6 border-b border-zinc-100 px-4 lg:px-0">
      {SEARCH_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const isDisabled = !tab.enabled;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled) {
                onChange?.(tab.id);
              }
            }}
            className={`relative pb-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-zinc-900"
                : isDisabled
                  ? "cursor-not-allowed text-zinc-300"
                  : "text-zinc-500 hover:text-zinc-700"
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
