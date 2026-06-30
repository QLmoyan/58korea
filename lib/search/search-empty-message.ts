import type { ParsedSearchContext } from "@/lib/search/parse-search-context";
import type { SearchTabId } from "@/lib/search/types";

function scopeLabel(tab: SearchTabId): string {
  if (tab === "users") {
    return "用户";
  }
  if (tab === "merchants") {
    return "商家";
  }
  return "内容";
}

export function buildSearchEmptyMessage(
  context: ParsedSearchContext | null,
  tab: SearchTabId = "all",
): string {
  const scope = scopeLabel(tab);

  if (!context) {
    return tab === "all"
      ? "没有找到相关内容"
      : `没有找到相关${scope}`;
  }

  const term = context.keyword ? `「${context.keyword}」` : "";

  switch (context.source) {
    case "query-place": {
      const place = context.place ?? "该地区";
      if (!context.keyword) {
        return `在${place}暂无相关${scope}`;
      }
      return `在${place}没有找到与${term}相关的${scope}`;
    }
    case "nearby-context": {
      const place = context.place ?? "当前地区";
      if (!context.keyword) {
        return `在${place}附近暂无相关${scope}`;
      }
      return `在${place}附近没有找到与${term}相关的${scope}`;
    }
    case "global-recommend":
      if (!context.keyword) {
        return `推荐范围内暂无相关${scope}`;
      }
      return `推荐范围内没有找到与${term}相关的${scope}`;
    case "global-latest":
      if (!context.keyword) {
        return `最新发布中暂无相关${scope}`;
      }
      return `最新发布中没有找到与${term}相关的${scope}`;
  }
}
