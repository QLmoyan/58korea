export type FeedChannel = "推荐" | "附近" | "最新";

export const POST_CATEGORIES = [
  "探店",
  "求助",
  "房屋",
  "二手",
  "招聘",
  "攻略",
  "其他",
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

const LEGACY_CATEGORY_ALIASES: Record<string, PostCategory> = {
  住房: "房屋",
  搭子: "其他",
};

export function isPostCategory(value: string): value is PostCategory {
  return (POST_CATEGORIES as readonly string[]).includes(value);
}

export function normalizePostCategory(value: string): PostCategory {
  if (isPostCategory(value)) {
    return value;
  }

  return LEGACY_CATEGORY_ALIASES[value] ?? "其他";
}

import { postMatchesSelectedRegion } from "@/lib/feed/match-post-region";
import type { SelectedRegion } from "@/lib/feed/regions";
import { DEFAULT_SELECTED_REGION } from "@/lib/feed/regions";
import type { RiskLevel } from "@/lib/moderation/constants";
import { sortPostsWithMerchantsFirst } from "@/lib/merchant/sort-posts";

export type PostDistance =
  | "100m"
  | "350m"
  | "800m"
  | "1.2km"
  | "2.4km"
  | "3.8km";

export interface PostImage {
  id: string;
  url: string;
  sortOrder: number;
  width?: number | null;
  height?: number | null;
}

export interface PostLinkedCouponSummary {
  id: string;
  title: string;
  discountAmountKrw: number;
  totalQuantity: number;
  claimedQuantity: number;
  startsAt: string | null;
  endsAt: string | null;
  usageNote: string | null;
  isActive: boolean;
}

export interface Post {
  id: number;
  title: string;
  content?: string;
  author: string;
  authorId?: string | null;
  authorUsername?: string | null;
  location: string;
  distance: PostDistance;
  likes: number;
  category: PostCategory;
  imageUrl: string | null;
  imageHeight: number | null;
  images?: PostImage[];
  nearby?: boolean;
  following?: boolean;
  createdAt?: string;
  riskLevel?: RiskLevel;
  riskScore?: number;
  linkedCouponId?: string | null;
  linkedCoupon?: PostLinkedCouponSummary | null;
}

export const channels: FeedChannel[] = ["推荐", "附近", "最新"];

export const categories: PostCategory[] = [...POST_CATEGORIES];

export const posts: Post[] = [
  {
    id: 1,
    title: "首尔转租单间 近2号线",
    author: "在韩小张",
    location: "建国大学",
    distance: "350m",
    likes: 328,
    category: "房屋",
    imageUrl: "https://picsum.photos/seed/korea-room1/400/520",
    imageHeight: 220,
    nearby: true,
    following: true,
  },
  {
    id: 2,
    title: "建大附近好吃烤肉推荐",
    author: "吃货阿琳",
    location: "建大",
    distance: "100m",
    likes: 1247,
    category: "探店",
    imageUrl: "https://picsum.photos/seed/korea-food1/400/480",
    imageHeight: 180,
    nearby: true,
    following: true,
  },
  {
    id: 3,
    title: "求兼职 咖啡店周末班",
    author: "留学生Lily",
    location: "江南站",
    distance: "800m",
    likes: 156,
    category: "招聘",
    imageUrl: "https://picsum.photos/seed/korea-job1/400/360",
    imageHeight: 160,
    nearby: true,
  },
  {
    id: 4,
    title: "出二手显示器 27寸2K",
    author: "数码达人",
    location: "延寿区",
    distance: "2.4km",
    likes: 89,
    category: "二手",
    imageUrl: "https://picsum.photos/seed/korea-monitor/400/440",
    imageHeight: 200,
    nearby: true,
  },
  {
    id: 5,
    title: "韩国银行卡办理攻略",
    author: "首尔生活家",
    location: "明洞",
    distance: "3.8km",
    likes: 2156,
    category: "攻略",
    imageUrl: "https://picsum.photos/seed/korea-bank/400/500",
    imageHeight: 210,
    following: true,
  },
  {
    id: 6,
    title: "明洞附近求租两室一厅",
    author: "小周找房",
    location: "明洞",
    distance: "350m",
    likes: 412,
    category: "房屋",
    imageUrl: "https://picsum.photos/seed/korea-room2/400/560",
    imageHeight: 240,
    nearby: true,
  },
  {
    id: 7,
    title: "新村韩餐避雷指南",
    author: "美食探店王",
    location: "新村",
    distance: "100m",
    likes: 892,
    category: "探店",
    imageUrl: "https://picsum.photos/seed/korea-food2/400/400",
    imageHeight: 170,
    nearby: true,
    following: true,
  },
  {
    id: 8,
    title: "急求帮搬行李 有偿",
    author: "刚到韩国",
    location: "龙山站",
    distance: "800m",
    likes: 67,
    category: "求助",
    imageUrl: "https://picsum.photos/seed/korea-help1/400/420",
    imageHeight: 190,
    nearby: true,
  },
  {
    id: 9,
    title: "出让宜家书桌 几乎全新",
    author: "毕业出清",
    location: "水原站",
    distance: "3.8km",
    likes: 203,
    category: "二手",
    imageUrl: "https://picsum.photos/seed/korea-desk/400/460",
    imageHeight: 195,
  },
  {
    id: 10,
    title: "寻找周末 hiking 搭子",
    author: "户外小陈",
    location: "高丽大",
    distance: "1.2km",
    likes: 534,
    category: "其他",
    imageUrl: "https://picsum.photos/seed/korea-hike/400/540",
    imageHeight: 230,
    nearby: true,
    following: true,
  },
  {
    id: 11,
    title: "弘大附近短租一个月",
    author: "短期转租",
    location: "弘大",
    distance: "350m",
    likes: 278,
    category: "房屋",
    imageUrl: "https://picsum.photos/seed/korea-room3/400/380",
    imageHeight: 165,
    nearby: true,
  },
  {
    id: 12,
    title: "韩国通信卡怎么选最划算",
    author: "通讯小助手",
    location: "建国大学",
    distance: "2.4km",
    likes: 1678,
    category: "其他",
    imageUrl: "https://picsum.photos/seed/korea-sim/400/490",
    imageHeight: 205,
    following: true,
  },
  {
    id: 13,
    title: "餐馆急招周末帮厨",
    author: "釜山老板",
    location: "海云台",
    distance: "3.8km",
    likes: 145,
    category: "招聘",
    imageUrl: "https://picsum.photos/seed/korea-kitchen/400/370",
    imageHeight: 158,
  },
  {
    id: 14,
    title: "求推荐靠谱中文牙医",
    author: "牙疼求助",
    location: "大田站",
    distance: "2.4km",
    likes: 312,
    category: "求助",
    imageUrl: "https://picsum.photos/seed/korea-dentist/400/430",
    imageHeight: 188,
  },
  {
    id: 15,
    title: "二手 MacBook Air M1",
    author: "苹果用户",
    location: "松坡区",
    distance: "800m",
    likes: 456,
    category: "二手",
    imageUrl: "https://picsum.photos/seed/korea-mac/400/510",
    imageHeight: 215,
    nearby: true,
    following: true,
  },
  {
    id: 16,
    title: "夜跑团招募新成员",
    author: "跑步搭子",
    location: "蚕室",
    distance: "1.2km",
    likes: 623,
    category: "其他",
    imageUrl: "https://picsum.photos/seed/korea-run/400/450",
    imageHeight: 192,
    nearby: true,
  },
  {
    id: 17,
    title: "高丽大租房经验分享",
    author: "高大学长",
    location: "高丽大",
    distance: "350m",
    likes: 934,
    category: "攻略",
    imageUrl: "https://picsum.photos/seed/korea-room4/400/530",
    imageHeight: 225,
    following: true,
  },
  {
    id: 18,
    title: "延世附近兼职家教",
    author: "家教老师",
    location: "延世大学",
    distance: "100m",
    likes: 187,
    category: "招聘",
    imageUrl: "https://picsum.photos/seed/korea-tutor/400/390",
    imageHeight: 168,
    nearby: true,
  },
  {
    id: 19,
    title: "入境接机拼车有人吗",
    author: "新生报到",
    location: "仁川机场",
    distance: "3.8km",
    likes: 98,
    category: "求助",
    imageUrl: "https://picsum.photos/seed/korea-airport/400/470",
    imageHeight: 198,
    nearby: true,
  },
  {
    id: 20,
    title: "釜山美食打卡清单",
    author: "釜山吃货",
    location: "海云台",
    distance: "1.2km",
    likes: 1567,
    category: "探店",
    imageUrl: "https://picsum.photos/seed/korea-busan/400/550",
    imageHeight: 235,
  },
];

export function filterPosts(
  posts: Post[],
  channel: FeedChannel,
  category: PostCategory | null,
  selectedRegion: SelectedRegion = DEFAULT_SELECTED_REGION,
): Post[] {
  let result = posts;

  if (category) {
    result = result.filter(
      (post) => normalizePostCategory(post.category) === category,
    );
  }

  if (channel === "附近") {
    result = result.filter((post) =>
      postMatchesSelectedRegion(post, selectedRegion),
    );
    return [...result].sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
  }

  if (channel === "最新") {
    return [...result].sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    });
  }

  return sortPostsWithMerchantsFirst(result);
}
