export type ChannelArticleStatus = "draft" | "published" | "hidden";

export interface Channel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelArticle {
  id: string;
  channel_id: string;
  author_id: string | null;
  title: string;
  cover_url: string | null;
  content_markdown: string;
  status: ChannelArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelArticleAuthor {
  id: string;
  nickname: string;
  username: string | null;
}

export interface ChannelArticleSummary {
  id: string;
  channel_id: string;
  title: string;
  cover_url: string | null;
  published_at: string | null;
  created_at: string;
}

export interface ChannelWithArticles extends Channel {
  recentArticles: ChannelArticleSummary[];
}

export interface ChannelArticleDetail extends ChannelArticle {
  channel: Pick<Channel, "id" | "slug" | "name">;
  author: ChannelArticleAuthor | null;
}

export const CHANNEL_ARTICLE_STATUS_LABELS: Record<ChannelArticleStatus, string> = {
  draft: "草稿",
  published: "已发布",
  hidden: "已隐藏",
};
