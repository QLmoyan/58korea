"use client";

import {
  DISCOVERY_CATEGORY_TABS,
  type DiscoveryCategoryTabId,
} from "@/lib/square/discovery-category-tabs";

interface DiscoveryCategoryTabsProps {
  value: DiscoveryCategoryTabId;
  onChange: (tabId: DiscoveryCategoryTabId) => void;
}

export default function DiscoveryCategoryTabs({
  value,
  onChange,
}: DiscoveryCategoryTabsProps) {
  return (
    <div
      className="border-b border-zinc-100 bg-white"
      data-testid="discovery-category-tabs"
    >
      <div
        className="scrollbar-hide flex gap-1 overflow-x-auto px-4 py-2 lg:gap-1.5 lg:px-0"
        role="tablist"
        aria-label="发现页分类"
      >
        {DISCOVERY_CATEGORY_TABS.map((tab) => {
          const isActive = value === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-discovery-tab={tab.id}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs transition-colors ${
                isActive
                  ? "bg-rose-50 font-medium text-rose-600"
                  : "font-normal text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
