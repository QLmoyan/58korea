"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Channel,
  ChannelArticle,
  ChannelArticleStatus,
} from "@/lib/types/channel-articles";

const CHANNEL_SELECT =
  "id, slug, name, description, cover_url, sort_order, is_active, created_at, updated_at";

const ARTICLE_SELECT =
  "id, channel_id, author_id, title, cover_url, content_markdown, status, published_at, created_at, updated_at";

export type AdminChannelArticleItem = ChannelArticle & {
  channel: Pick<Channel, "id" | "slug" | "name">;
};

export interface SaveChannelArticleInput {
  channelId: string;
  title: string;
  coverUrl?: string | null;
  contentMarkdown: string;
  status?: ChannelArticleStatus;
}

function mapAdminArticle(
  row: ChannelArticle & { channel: Pick<Channel, "id" | "slug" | "name"> },
): AdminChannelArticleItem {
  return row;
}

export async function listAdminChannelsAction(): Promise<Channel[]> {
  await assertAdminPermission("channel_articles.read");
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("channels")
    .select(CHANNEL_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Channel[];
}

export async function listAdminChannelArticlesAction(): Promise<AdminChannelArticleItem[]> {
  await assertAdminPermission("channel_articles.read");
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("channel_articles")
    .select(`${ARTICLE_SELECT}, channel:channels!inner(id, slug, name)`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapAdminArticle(
      row as ChannelArticle & { channel: Pick<Channel, "id" | "slug" | "name"> },
    ),
  );
}

export async function createChannelArticleAction(
  input: SaveChannelArticleInput,
): Promise<AdminChannelArticleItem> {
  const actor = await assertAdminPermission("channel_articles.write");
  const supabase = getSupabaseAdminClient();

  const title = input.title.trim();
  const contentMarkdown = input.contentMarkdown.trim();
  if (!input.channelId) {
    throw new Error("请选择频道");
  }
  if (!title) {
    throw new Error("标题不能为空");
  }
  if (!contentMarkdown) {
    throw new Error("正文不能为空");
  }

  const status = input.status ?? "draft";
  const now = new Date().toISOString();
  const authorId = actor.kind === "account" ? actor.userId : null;

  const { data, error } = await supabase
    .from("channel_articles")
    .insert({
      channel_id: input.channelId,
      author_id: authorId,
      title,
      cover_url: input.coverUrl?.trim() || null,
      content_markdown: contentMarkdown,
      status,
      published_at: status === "published" ? now : null,
    })
    .select(`${ARTICLE_SELECT}, channel:channels!inner(id, slug, name)`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminArticle(
    data as ChannelArticle & { channel: Pick<Channel, "id" | "slug" | "name"> },
  );
}

export async function updateChannelArticleAction(
  articleId: string,
  input: SaveChannelArticleInput,
): Promise<AdminChannelArticleItem> {
  await assertAdminPermission("channel_articles.write");
  const supabase = getSupabaseAdminClient();

  const title = input.title.trim();
  const contentMarkdown = input.contentMarkdown.trim();
  if (!input.channelId) {
    throw new Error("请选择频道");
  }
  if (!title) {
    throw new Error("标题不能为空");
  }
  if (!contentMarkdown) {
    throw new Error("正文不能为空");
  }

  const { data: existing, error: existingError } = await supabase
    .from("channel_articles")
    .select("status, published_at")
    .eq("id", articleId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (!existing) {
    throw new Error("文章不存在");
  }

  const nextStatus = input.status ?? (existing.status as ChannelArticleStatus);
  const publishedAt =
    nextStatus === "published"
      ? existing.published_at ?? new Date().toISOString()
      : null;

  const { data, error } = await supabase
    .from("channel_articles")
    .update({
      channel_id: input.channelId,
      title,
      cover_url: input.coverUrl?.trim() || null,
      content_markdown: contentMarkdown,
      status: nextStatus,
      published_at: publishedAt,
    })
    .eq("id", articleId)
    .select(`${ARTICLE_SELECT}, channel:channels!inner(id, slug, name)`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminArticle(
    data as ChannelArticle & { channel: Pick<Channel, "id" | "slug" | "name"> },
  );
}

export async function setChannelArticleStatusAction(
  articleId: string,
  status: ChannelArticleStatus,
): Promise<AdminChannelArticleItem> {
  await assertAdminPermission("channel_articles.write");
  const supabase = getSupabaseAdminClient();

  const publishedAt =
    status === "published" ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("channel_articles")
    .update({
      status,
      published_at: publishedAt,
    })
    .eq("id", articleId)
    .select(`${ARTICLE_SELECT}, channel:channels!inner(id, slug, name)`)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapAdminArticle(
    data as ChannelArticle & { channel: Pick<Channel, "id" | "slug" | "name"> },
  );
}
