"use client";

import type { RuleEnabledFilter, RuleSortBy } from "@/lib/types/admin-rules";
import {
  RULE_ENABLED_FILTER_OPTIONS,
  RULE_SORT_OPTIONS,
} from "@/lib/types/admin-rules";

interface RuleToolbarProps {
  enabledFilter: RuleEnabledFilter;
  sortBy: RuleSortBy;
  search: string;
  onEnabledFilterChange: (value: RuleEnabledFilter) => void;
  onSortByChange: (value: RuleSortBy) => void;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
}

export default function RuleToolbar({
  enabledFilter,
  sortBy,
  search,
  onEnabledFilterChange,
  onSortByChange,
  onSearchChange,
  onCreate,
}: RuleToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RULE_ENABLED_FILTER_OPTIONS.map((option) => {
          const active = enabledFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onEnabledFilterChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-rose-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {RULE_SORT_OPTIONS.map((option) => {
            const active = sortBy === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortByChange(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索关键词..."
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-200 sm:w-56"
          />
          <button
            type="button"
            onClick={onCreate}
            className="rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            新增规则
          </button>
        </div>
      </div>
    </div>
  );
}
