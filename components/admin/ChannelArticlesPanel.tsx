"use client";

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
  buildMarkdownImageSnippet,
  insertTextAtSelection,
} from "@/lib/channels/markdown-images";
import {
  CHANNEL_ARTICLE_STATUS_LABELS,
  type Channel,
  type ChannelArticleStatus,
} from "@/lib/types/channel-articles";
import { formatChannelArticleDate } from "@/lib/channels/format";
import {
  uploadChannelArticleCoverToStorage,
  uploadChannelArticleInlineImageToStorage,
} from "@/lib/supabase/storage";

const STATUS_OPTIONS: ChannelArticleStatus[] = ["draft", "published", "hidden"];
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/*";

interface ArticleFormState {
  channelId: string;
  title: string;
  coverUrl: string;
  contentMarkdown: string;
  status: ChannelArticleStatus;
}

const EMPTY_FORM: ArticleFormState = {
  channelId: "",
  title: "",
  coverUrl: "",
  contentMarkdown: "",
  status: "draft",
};

export default function ChannelArticlesPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [articles, setArticles] = useState<AdminChannelArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingInlineImage, setUploadingInlineImage] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const contentMarkdownRef = useRef<HTMLTextAreaElement>(null);

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
      setForm((current) => ({
        ...current,
        channelId: current.channelId || channelRows[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      channelId: channels[0]?.id ?? "",
    });
  }

  function startEdit(article: AdminChannelArticleItem) {
    setEditingId(article.id);
    setForm({
      channelId: article.channel_id,
      title: article.title,
      coverUrl: article.cover_url ?? "",
      contentMarkdown: article.content_markdown,
      status: article.status,
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
    const selectionStart = textarea?.selectionStart ?? form.contentMarkdown.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;

    setForm((current) => ({
      ...current,
      contentMarkdown: insertTextAtSelection(
        current.contentMarkdown,
        snippet,
        selectionStart,
        selectionEnd,
      ),
    }));

    window.requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }

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
    setSaving(true);
    setError("");

    try {
      const payload = {
        channelId: form.channelId,
        title: form.title,
        coverUrl: form.coverUrl || null,
        contentMarkdown: form.contentMarkdown,
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

  async function handleStatusChange(
    articleId: string,
    status: ChannelArticleStatus,
  ) {
    setSaving(true);
    setError("");

    try {
      await setChannelArticleStatusAction(articleId, status);
      await loadData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "状态更新失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">频道文章</h2>
            <p className="mt-1 text-sm text-zinc-500">创建、编辑、发布广场频道文章</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
          >
            新建文章
          </button>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-400">加载中...</p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-zinc-400">还没有频道文章</p>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-zinc-100 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-rose-500">
                      {article.channel.name}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-zinc-900">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-xs text-zinc-400">
                      {CHANNEL_ARTICLE_STATUS_LABELS[article.status]} ·{" "}
                      {formatChannelArticleDate(
                        article.published_at ?? article.updated_at,
                      )}
                    </p>
                  </div>
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
                        onClick={() => void handleStatusChange(article.id, "published")}
                        className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        发布
                      </button>
                    ) : null}
                    {article.status !== "hidden" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleStatusChange(article.id, "hidden")}
                        className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        隐藏
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="h-fit space-y-4 rounded-2xl border border-zinc-100 bg-white p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {editingId ? "编辑文章" : "创建文章"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">正文支持 Markdown 图文混排</p>
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
          <span className="text-xs font-medium text-zinc-600">封面图</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleCoverUpload(file);
            }}
            className="w-full text-sm"
          />
          {uploadingCover ? (
            <p className="text-xs text-zinc-400">上传中...</p>
          ) : null}
          {form.coverUrl ? (
            <p className="break-all text-xs text-zinc-400">{form.coverUrl}</p>
          ) : null}
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
                  const file = event.target.files?.[0] ?? null;
                  void handleInlineImageUpload(file);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <textarea
            ref={contentMarkdownRef}
            value={form.contentMarkdown}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contentMarkdown: event.target.value,
              }))
            }
            rows={14}
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-6"
            placeholder={
              "## 小标题\n\n正文段落\n\n**加粗**\n\n[链接文字](https://example.com)\n\n![图片说明](https://example.com/image.jpg)"
            }
            required
          />
          <p className="text-[11px] leading-5 text-zinc-400">
            上传正文图片后会自动插入 `![说明](图片URL)` 语法
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploadingCover || uploadingInlineImage}
            className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "保存中..." : editingId ? "保存修改" : "创建文章"}
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
    </section>
  );
}
