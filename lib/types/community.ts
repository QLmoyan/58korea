import type { PostCategory } from "@/lib/data/posts";

export const publishCategories = [
  "租房",
  "招聘",
  "二手",
  "求助",
  "攻略",
  "搭子",
] as const;

export type PublishCategory = (typeof publishCategories)[number];

export const publishCategoryMap: Record<PublishCategory, PostCategory> = {
  租房: "住房",
  招聘: "招聘",
  二手: "二手",
  求助: "求助",
  攻略: "攻略",
  搭子: "搭子",
};

export interface AddCommentReply {
  parentId: string;
  replyToAuthor: string;
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
}

export interface AddCommentInput {
  content: string;
  reply?: AddCommentReply;
  image?: File;
}

export interface CreatePostInput {
  title: string;
  content: string;
  category: PublishCategory;
  images?: File[];
}

export const ANONYMOUS_NAMES = [
  "在韩小张",
  "首尔路人",
  "留学生A",
  "社区网友",
  "热心华人",
  "隔壁邻居",
];
