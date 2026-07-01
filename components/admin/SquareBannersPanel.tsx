"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createSquareBannerAction,
  deleteSquareBannerAction,
  listAdminSquareBannersAction,
  setSquareBannerActiveAction,
  updateSquareBannerAction,
  type AdminSquareBannerItem,
} from "@/lib/actions/admin-square-banners";
import { uploadSquareBannerImageToStorage } from "@/lib/supabase/storage";

interface BannerFormState {
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: BannerFormState = {
  title: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: "0",
  isActive: true,
};

const BANNER_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/*";

export default function SquareBannersPanel() {
  const [banners, setBanners] = useState<AdminSquareBannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const rows = await listAdminSquareBannersAction();
      setBanners(rows);
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
    setForm(EMPTY_FORM);
  }

  function startEdit(banner: AdminSquareBannerItem) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      imageUrl: banner.image_url,
      linkUrl: banner.link_url ?? "",
      sortOrder: String(banner.sort_order),
      isActive: banner.is_active,
    });
  }

  async function handleImageUpload(file: File | null) {
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError("");

    try {
      const uploaded = await uploadSquareBannerImageToStorage(file);
      setForm((current) => ({ ...current, imageUrl: uploaded.publicUrl }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "图片上传失败");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.imageUrl.trim()) {
      setError("请上传 Banner 图片");
      return;
    }

    setSaving(true);
    setError("");

    const sortOrder = Number.parseInt(form.sortOrder, 10);

    try {
      const payload = {
        title: form.title,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || null,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        isActive: form.isActive,
      };

      if (editingId) {
        await updateSquareBannerAction(editingId, payload);
      } else {
        await createSquareBannerAction(payload);
      }

      resetForm();
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(banner: AdminSquareBannerItem) {
    setSaving(true);
    setError("");

    try {
      await setSquareBannerActiveAction(banner.id, !banner.is_active);
      await loadData();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "状态更新失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bannerId: string) {
    if (!window.confirm("确定删除这个 Banner？")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteSquareBannerAction(bannerId);
      if (editingId === bannerId) {
        resetForm();
      }
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">广场 Banner</h2>
            <p className="mt-1 text-sm text-zinc-500">
              配置发现页轮播图，仅展示已启用项
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
          >
            新建 Banner
          </button>
        </div>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-zinc-400">加载中...</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-zinc-400">还没有 Banner，前台将不显示轮播区</p>
        ) : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <article
                key={banner.id}
                className="rounded-2xl border border-zinc-100 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">{banner.title}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            banner.is_active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {banner.is_active ? "已启用" : "已停用"}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          排序 {banner.sort_order}
                        </span>
                      </div>
                      {banner.link_url ? (
                        <p className="mt-1 truncate text-xs text-zinc-400">
                          链接 {banner.link_url}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(banner)}
                      className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleToggleActive(banner)}
                      className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-60"
                    >
                      {banner.is_active ? "停用" : "启用"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(banner.id)}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="h-fit space-y-4 rounded-2xl border border-zinc-100 bg-white p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {editingId ? "编辑 Banner" : "新建 Banner"}
          </h3>
          <p className="mt-1 text-xs text-zinc-500">上传图片后将自动写入 image_url</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-600">标题</span>
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
            required
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-600">Banner 图片</span>
          <label className="inline-flex cursor-pointer items-center rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200">
            {uploadingImage ? "上传中..." : form.imageUrl ? "重新上传" : "选择图片"}
            <input
              type="file"
              accept={BANNER_IMAGE_ACCEPT}
              className="hidden"
              disabled={uploadingImage || saving}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleImageUpload(file);
                event.target.value = "";
              }}
            />
          </label>
          {form.imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
              <div className="relative aspect-[5/2] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Banner 预览"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">请上传 JPG、PNG 或 WebP 图片</p>
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-600">链接 URL（可选）</span>
          <input
            value={form.linkUrl}
            onChange={(event) =>
              setForm((current) => ({ ...current, linkUrl: event.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
            placeholder="/channels/official 或 https://..."
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-zinc-600">排序（越小越靠前）</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: event.target.value }))
            }
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          启用
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving || uploadingImage || !form.imageUrl.trim()}
            className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {saving ? "保存中..." : editingId ? "保存修改" : "创建 Banner"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200"
            >
              取消
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
