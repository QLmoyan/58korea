import type {
  Channel,
  ChannelArticle,
  ChannelArticleAuthor,
  ChannelArticleDetail,
  ChannelArticleStatus,
  ChannelArticleSummary,
  ChannelWithArticles,
} from "@/lib/types/channel-articles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CHANNEL_SELECT =
  "id, slug, name, description, cover_url, sort_order, is_active, created_at, updated_at";

const ARTICLE_SUMMARY_SELECT =
  "id, channel_id, title, cover_url, published_at, created_at";

const ARTICLE_DETAIL_SELECT =
  "id, channel_id, author_id, title, cover_url, content_markdown, status, published_at, created_at, updated_at";

function mapChannel(row: Channel): Channel {
  return row;
}

function mapArticleSummary(row: ChannelArticleSummary): ChannelArticleSummary {
  return row;
}

function mapAuthor(
  row: { id: string; nickname: string; username: string | null } | null,
): ChannelArticleAuthor | null {
  if (!row) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    username: row.username,
  };
}

export async function fetchActiveChannels(): Promise<Channel[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("channels")
    .select(CHANNEL_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapChannel(row as Channel));
}

export async function fetchSquareChannelModules(): Promise<ChannelWithArticles[]> {
  const channels = await fetchActiveChannels();
  if (channels.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const channelIds = channels.map((channel) => channel.id);

  const { data, error } = await supabase
    .from("channel_articles")
    .select(ARTICLE_SUMMARY_SELECT)
    .in("channel_id", channelIds)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const articlesByChannel = new Map<string, ChannelArticleSummary[]>();

  for (const row of data ?? []) {
    const article = mapArticleSummary(row as ChannelArticleSummary);
    const existing = articlesByChannel.get(article.channel_id) ?? [];
    if (existing.length < 3) {
      existing.push(article);
      articlesByChannel.set(article.channel_id, existing);
    }
  }

  return channels.map((channel) => ({
    ...channel,
    recentArticles: articlesByChannel.get(channel.id) ?? [],
  }));
}

export async function fetchChannelBySlug(slug: string): Promise<Channel | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("channels")
    .select(CHANNEL_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapChannel(data as Channel) : null;
}

export async function fetchPublishedArticlesByChannelSlug(
  slug: string,
): Promise<{ channel: Channel; articles: ChannelArticleSummary[] } | null> {
  const channel = await fetchChannelBySlug(slug);
  if (!channel) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("channel_articles")
    .select(ARTICLE_SUMMARY_SELECT)
    .eq("channel_id", channel.id)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    channel,
    articles: (data ?? []).map((row) => mapArticleSummary(row as ChannelArticleSummary)),
  };
}

export async function fetchPublishedArticleById(
  id: string,
): Promise<ChannelArticleDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("channel_articles")
    .select(
      `${ARTICLE_DETAIL_SELECT}, channel:channels!inner(id, slug, name), author:profiles(id, nickname, username)`,
    )
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as ChannelArticle & {
    channel: Pick<Channel, "id" | "slug" | "name">;
    author: { id: string; nickname: string; username: string | null } | null;
  };

  return {
    id: row.id,
    channel_id: row.channel_id,
    author_id: row.author_id,
    title: row.title,
    cover_url: row.cover_url,
    content_markdown: row.content_markdown,
    status: row.status as ChannelArticleStatus,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    channel: row.channel,
    author: mapAuthor(row.author),
  };
}
