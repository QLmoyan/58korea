"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChannelArticleAction,
  listAdminChannelArticlesAction,
  listAdminChannelsAction,
  setChannelArticleStatusAction,
  updateChannelArticleAction,
  type AdminChannelArticleItem,
} from "@/lib/actions/admin-channel-articles";
import {
  assembleDiscoveryArticleMarkdown,
  parseDiscoveryArticleMarkdown,
} from "@/lib/channels/discovery-article-content";
import { DISCOVERY_NEWS_CHANNEL_SLUG } from "@/lib/channels/constants";
import {
  buildMarkdownImageSnippet,
  insertTextAtSelection,
} from "@/lib/channels/markdown-images";
import { formatChannelArticleDate } from "@/lib/channels/format";
import {
  CHANNEL_ARTICLE_STATUS_LABELS,
  type Channel,
  type ChannelArticleStatus,
} from "@/lib/types/channel-articles";
import {
  uploadChannelArticleCoverToStorage,
  uploadChannelArticleInlineImageToStorage,
} from "@/lib/supabase/storage";
import { useAdminCapabilities } from "@/components/admin/AdminCapabilitiesProvider";

const STATUS_OPTIONS: ChannelArticleStatus[] = ["draft", "published"];
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/*";

interface NewsFormState {
  channelId: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  coverUrl: string;
  sourceUrl: string;
  status: ChannelArticleStatus;
}

const EMPTY_FORM: NewsFormState = {
  channelId: "",
  title: "",
  summary: "",
  bodyMarkdown: "",
  coverUrl: "",
  sourceUrl: "",
  status: "draft",
};

export default function DiscoveryContentPanel() {
  const { permissions } = useAdminCapabilities();
  const canRead = permissions.includes("channel_articles.read");
  const canWrite = permissions.includes("channel_articles.write");
  const contentMarkdownRef = useRef<HTMLTextAreaElement>(null);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [articles, setArticles] = useState<AdminChannelArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsFormState>(EMPTY_FORM);

  const newsArticles = articles.filter(
    (article) => article.channel.slug === DISCOVERY_NEWS_CHANNEL_SLUG,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [channelRows, articleRows] = await Promise.all([
        listAdminChannelsAction(),
        listAdminChannelArticlesAction(),
      ]);
      setChannels(channelRows);
      setArticles(articleRows);

      const defaultChannel =
        channelRows.find((channel) => channel.slug === DISCOVERY_NEWS_CHANNEL_SLUG) ??
        channelRows[0];

      setForm((current) => ({
        ...current,
        channelId: current.channelId || defaultChannel?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;

    let active = true;
    queueMicrotask(() => {
      if (active) {
        void loadData();
      }
    });

    return () => {
      active = false;
    };
  }, [canRead, loadData]);

  function resetForm() {
    const defaultChannel =
      channels.find((channel) => channel.slug === DISCOVERY_NEWS_CHANNEL_SLUG) ??
      channels[0];

    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      channelId: defaultChannel?.id ?? "",
    });
  }

  function startEdit(article: AdminChannelArticleItem) {
    const parsed = parseDiscoveryArticleMarkdown(article.content_markdown);

    setEditingId(article.id);
    setForm({
      channelId: article.channel_id,
      title: article.title,
      summary: parsed.summary,
      bodyMarkdown: parsed.bodyMarkdown,
      coverUrl: article.cover_url ?? "",
      sourceUrl: parsed.sourceUrl,
      status: article.status === "hidden" ? "draft" : article.status,
    });
  }

  async function handleCoverUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingCover(true);
    setError("");

    try {
      const uploaded = await uploadChannelArticleCoverToStorage(file);
      setForm((current) => ({ ...current, coverUrl: uploaded.publicUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "封面上传失败");
    } finally {
      setUploadingCover(false);
    }
  }

  function insertMarkdownSnippet(snippet: string) {
    const textarea = contentMarkdownRef.current;
    if (!textarea) {
      setForm((current) => ({
        ...current,
        bodyMarkdown: `${current.bodyMarkdown}${snippet}`,
      }));
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    setForm((current) => ({
      ...current,
      bodyMarkdown: insertTextAtSelection(
        current.bodyMarkdown,
        snippet,
        selectionStart,
        selectionEnd,
      ),
    }));

    requestAnimationFrame(() => {
      const nextCursor = selectionStart + snippet.length;
      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function handleInlineImageUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingInlineImage(true);
    setError("");

    try {
      const uploaded = await uploadChannelArticleInlineImageToStorage(file);
      const caption = window.prompt("图片说明（可选）", "") ?? "";
      insertMarkdownSnippet(buildMarkdownImageSnippet(uploaded.publicUrl, caption));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "正文图片上传失败");
    } finally {
      setUploadingInlineImage(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canWrite) {
      setError("当前账号没有写权限");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const contentMarkdown = assembleDiscoveryArticleMarkdown({
        summary: form.summary,
        bodyMarkdown: form.bodyMarkdown,
        sourceUrl: form.sourceUrl,
      });

      const payload = {
        channelId: form.channelId,
        title: form.title,
        coverUrl: form.coverUrl || null,
        contentMarkdown,
        status: form.status,
      };

      if (editingId) {
        await updateChannelArticleAction(editingId, payload);
      } else {
        await createChannelArticleAction(payload);
      }

      resetForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(articleId: string) {
    setSaving(true);
    setError("");

    try {
      await setChannelArticleStatusAction(articleId, "published");
      await loadData();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布失败");
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 text-sm text-zinc-500">
        当前账号无权编辑发现页内容。
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl bg-zinc-50">
      <header className="border-b border-zinc-100 bg-white px-4 py-4 lg:px-6">
        <Link href="/admin" className="text-xs text-zinc-400 hover:text-zinc-600">
          ← 返回运营后台
        </Link>
        <h1 className="mt-2 text-lg font-semibold text-zinc-900">发现页内容编辑</h1>
        <p className="mt-1 text-sm text-zinc-500">
          手动创建并发布发现页新闻，保存到频道文章，不依赖自动采集或 AI
        </p>
      </header>

      <main className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">新闻列表</h2>
              <p className="mt-1 text-sm text-zinc-500">默认新闻频道，发布后出现在发现页「新闻」Tab</p>
            </div>
            {canWrite ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
              >
                新建新闻
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-zinc-400">加载中...</p>
          ) : newsArticles.length === 0 ? (
            <p className="text-sm text-zinc-400">还没有新闻内容</p>
          ) : (
            <div className="space-y-3">
              {newsArticles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-2xl border border-zinc-100 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-zinc-900">{article.title}</h3>
                      <p className="mt-2 text-xs text-zinc-400">
                        {CHANNEL_ARTICLE_STATUS_LABELS[article.status]} ·{" "}
                        {formatChannelArticleDate(
                          article.published_at ?? article.updated_at,
                        )}
                      </p>
                    </div>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(article)}
                          className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600"
                        >
                          编辑
                        </button>
                        {article.status !== "published" ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handlePublish(article.id)}
                            className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                          >
                            发布
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {canWrite ? (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="h-fit space-y-4 rounded-2xl border border-zinc-100 bg-white p-4"
          >
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                {editingId ? "编辑新闻" : "创建新闻"}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">手动填写，支持 Markdown 图文混排</p>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">频道</span>
              <select
                value={form.channelId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, channelId: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                required
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">标题</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">摘要</span>
              <textarea
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-6"
                placeholder="简短摘要，显示在发现页列表"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">封面图</span>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(event) => {
                  void handleCoverUpload(event.target.files?.[0] ?? null);
                }}
                className="w-full text-sm"
              />
              {uploadingCover ? <p className="text-xs text-zinc-400">上传中...</p> : null}
              {form.coverUrl ? (
                <p className="break-all text-xs text-zinc-400">{form.coverUrl}</p>
              ) : null}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">来源链接（可选）</span>
              <input
                value={form.sourceUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sourceUrl: event.target.value }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-600">状态</span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ChannelArticleStatus,
                  }))
                }
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {CHANNEL_ARTICLE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>

            <div className="block space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-zinc-600">正文 Markdown</span>
                <label className="inline-flex cursor-pointer items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
                  {uploadingInlineImage ? "上传中..." : "插入正文图片"}
                  <input
                    type="file"
                    accept={IMAGE_ACCEPT}
                    className="hidden"
                    disabled={uploadingInlineImage || saving}
                    onChange={(event) => {
                      void handleInlineImageUpload(event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              <textarea
                ref={contentMarkdownRef}
                value={form.bodyMarkdown}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    bodyMarkdown: event.target.value,
                  }))
                }
                rows={12}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-6"
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || uploadingCover || uploadingInlineImage}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "保存中..." : editingId ? "保存修改" : "保存新闻"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600"
                >
                  取消
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}
