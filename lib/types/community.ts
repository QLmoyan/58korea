import {
  AI_AUTO_CATEGORY,
  type PublishCategorySelection,
} from "@/lib/posts/resolve-post-category";

export const publishCategoryChoices: PublishCategorySelection[] = [
  AI_AUTO_CATEGORY,
  "探店",
  "求助",
  "房屋",
  "二手",
  "招聘",
  "攻略",
  "其他",
];

export const publishCategoryLabels: Record<PublishCategorySelection, string> = {
  [AI_AUTO_CATEGORY]: "自动分类",
  探店: "探店",
  求助: "求助",
  房屋: "房屋",
  二手: "二手",
  招聘: "招聘",
  攻略: "攻略",
  其他: "其他",
};

export interface AddCommentReply {
  parentId: string;
  replyToAuthor: string;
}

export interface CommentImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface Comment {
  id: string;
  postId: number;
  author: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  replyToAuthor: string | null;
  imageUrl: string | null;
  images: CommentImage[];
}

export interface AddCommentInput {
  content: string;
  reply?: AddCommentReply;
  images?: File[];
}

export interface CreatePostInput {
  title: string;
  content: string;
  categorySelection: PublishCategorySelection;
  location?: string;
  images?: File[];
  couponBinding?: PostCouponBindingInput;
}

export type PostCouponBindingMode = "none" | "add";

export interface PublishPostNewCouponInput {
  discountAmountKrw: number;
  totalQuantity: number;
  startsDate: string;
  startsTime: string;
  endsDate: string;
  endsTime: string;
  usageNote?: string | null;
}

export type PostCouponBindingInput =
  | { mode: "none" }
  | { mode: "add"; coupon: PublishPostNewCouponInput };

export const ANONYMOUS_NAMES = [
  "在韩小张",
  "首尔路人",
  "留学生A",
  "社区网友",
  "热心华人",
  "隔壁邻居",
];

export type { PublishCategorySelection };
