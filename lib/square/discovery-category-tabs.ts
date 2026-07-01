import {
  filterPosts,
  normalizePostCategory,
  type Post,
} from "@/lib/data/posts";
import { sortPostsWithMerchantsFirst } from "@/lib/merchant/sort-posts";

export const DISCOVERY_CATEGORY_TABS = [
  { id: "all", label: "全部" },
  { id: "news", label: "新闻" },
  { id: "events", label: "活动" },
  { id: "medical", label: "医美" },
  { id: "estate", label: "不动产" },
  { id: "hotel", label: "酒店" },
  { id: "used-car", label: "二手车" },
  { id: "secondhand", label: "二手" },
] as const;

export type DiscoveryCategoryTabId =
  (typeof DISCOVERY_CATEGORY_TABS)[number]["id"];

export const DEFAULT_DISCOVERY_CATEGORY_TAB: DiscoveryCategoryTabId = "all";

function buildPostSearchText(post: Post): string {
  return [post.title, post.content, post.location].filter(Boolean).join(" ");
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

const NEWS_KEYWORDS = ["新闻", "资讯", "头条", "快讯"] as const;
const EVENT_KEYWORDS = ["活动", "聚会", "演出", "展览", "搭子", "局", "报名"] as const;
const MEDICAL_KEYWORDS = ["医美", "整形", "皮肤", "美容", "隆鼻", "双眼皮"] as const;
const ESTATE_KEYWORDS = ["不动产", "租房", "转租", "月租", "全租", "看房"] as const;
const HOTEL_KEYWORDS = ["酒店", "住宿", "民宿", "旅馆", "宾馆"] as const;
const USED_CAR_KEYWORDS = [
  "二手车",
  "卖车",
  "买车",
  "汽车",
  "轿车",
  "车辆",
  "SUV",
] as const;

export function postMatchesUsedCar(post: Post): boolean {
  const text = buildPostSearchText(post);
  return includesAny(text, USED_CAR_KEYWORDS);
}

export function postMatchesDiscoveryTab(
  post: Post,
  tabId: DiscoveryCategoryTabId,
): boolean {
  if (tabId === "all") {
    return true;
  }

  const text = buildPostSearchText(post);
  const category = normalizePostCategory(post.category);

  switch (tabId) {
    case "news":
      return includesAny(text, NEWS_KEYWORDS);
    case "events":
      return includesAny(text, EVENT_KEYWORDS);
    case "medical":
      return includesAny(text, MEDICAL_KEYWORDS);
    case "estate":
      return category === "房屋" || includesAny(text, ESTATE_KEYWORDS);
    case "hotel":
      return includesAny(text, HOTEL_KEYWORDS);
    case "used-car":
      return postMatchesUsedCar(post);
    case "secondhand":
      return category === "二手" && !postMatchesUsedCar(post);
    default:
      return false;
  }
}

export function filterPostsForDiscoveryTab(
  posts: Post[],
  tabId: DiscoveryCategoryTabId,
): Post[] {
  const recommended = filterPosts(posts, "推荐", null);

  if (tabId === "all") {
    return recommended;
  }

  return sortPostsWithMerchantsFirst(
    recommended.filter((post) => postMatchesDiscoveryTab(post, tabId)),
  );
}

export function getDiscoveryTabEmptyMessage(
  tabId: DiscoveryCategoryTabId,
  hasNewsArticles = false,
): string {
  if (tabId === "all") {
    return "暂无推荐帖子";
  }

  if (tabId === "news" && hasNewsArticles) {
    return "暂无更多新闻相关帖子";
  }

  const tab = DISCOVERY_CATEGORY_TABS.find((item) => item.id === tabId);
  return `暂无${tab?.label ?? ""}相关内容`;
}
