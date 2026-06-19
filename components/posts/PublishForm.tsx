"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { usePostStore } from "@/lib/store/post-store";
import { createClientId } from "@/lib/utils/create-client-id";
import {
  publishCategories,
  type PublishCategory,
} from "@/lib/types/community";

const MAX_IMAGES = 9;
const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*";

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export default function PublishForm() {
  const router = useRouter();
  const { addPost } = usePostStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PublishCategory>("租房");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handlePickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }

    const nextFiles = files.slice(0, remaining);
    const nextImages = nextFiles.map((file) => ({
      id: createClientId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...nextImages]);
    setError("");
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return current.filter((image) => image.id !== id);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("请填写标题");
      return;
    }

    if (!content.trim()) {
      setError("请填写内容");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessNotice("");

    try {
      const result = await addPost({
        title,
        content,
        category,
        images: images.map((image) => image.file),
      });

      if (result.notice) {
        setTitle("");
        setContent("");
        setImages((current) => {
          current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return [];
        });
        setSuccessNotice(result.notice);
        return;
      }

      router.push("/");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "发布失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-8">
      <PageHeader title="发布帖子" backHref="/" />

      <main className="px-4 pt-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              标题
            </label>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="请输入帖子标题"
              className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300"
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              分类
            </label>
            <div className="flex flex-wrap gap-2">
              {publishCategories.map((item) => {
                const isActive = category === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              内容
            </label>
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setError("");
              }}
              placeholder="分享你的租房、招聘、攻略或求助信息..."
              rows={8}
              className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300"
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700">图片</label>
              <span className="text-xs text-zinc-400">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl}
                    alt="已选图片"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white touch-manipulation"
                    aria-label="删除图片"
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES ? (
                <label
                  htmlFor={fileInputId}
                  className="flex aspect-square cursor-pointer items-center justify-center rounded-xl bg-zinc-50 text-2xl text-zinc-400 ring-1 ring-zinc-200 touch-manipulation transition-colors active:bg-zinc-100"
                  aria-label="添加图片"
                >
                  +
                </label>
              ) : null}
            </div>

            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="sr-only"
              onChange={handlePickImages}
            />
          </section>

          {error ? (
            <p className="text-center text-sm text-rose-500">{error}</p>
          ) : null}

          {successNotice ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm leading-6 text-amber-700 ring-1 ring-amber-100">
              {successNotice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "发布中..." : "发布"}
          </button>
        </form>
      </main>
    </div>
  );
}
