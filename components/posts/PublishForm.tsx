"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import PublishCouponSettings from "@/components/posts/PublishCouponSettings";
import { isVerifiedMerchantAccount } from "@/lib/merchant/identify";
import {
  clearPublishDraft,
  loadPublishDraft,
  savePublishDraft,
} from "@/lib/merchant/publish-draft";
import { validatePublishCouponBinding } from "@/lib/merchant/validate-publish-coupon";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMerchantStoreOptional } from "@/lib/store/merchant-store";
import { usePostStore } from "@/lib/store/post-store";
import { createClientId } from "@/lib/utils/create-client-id";
import {
  publishCategoryChoices,
  publishCategoryLabels,
  type PostCouponBindingInput,
  type PublishCategorySelection,
} from "@/lib/types/community";
import { AI_AUTO_CATEGORY } from "@/lib/posts/resolve-post-category";
import { getDisplayUsername } from "@/lib/auth/username";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";

const MAX_IMAGES = 9;
const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*";

interface SelectedImage {
  id: string;
  file: File;
  previewUrl: string;
}

function formatPublishError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "发布失败，请稍后重试";

  if (/图片上传失败/i.test(message)) {
    return `${message} 文字内容已保留，请检查网络后重试。`;
  }

  return message;
}

export default function PublishForm() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthStore();
  const merchantStore = useMerchantStoreOptional();
  const { addPost } = usePostStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const submitLockRef = useRef(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categorySelection, setCategorySelection] =
    useState<PublishCategorySelection>(AI_AUTO_CATEGORY);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [couponBinding, setCouponBinding] = useState<PostCouponBindingInput>({
    mode: "none",
  });
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [imagePickError, setImagePickError] = useState("");

  const displayUsername = getDisplayUsername(user);
  const authorName = resolveAuthorNameFromAuth(user, profile);
  const merchantProfile = user?.id
    ? merchantStore?.getMerchantByUserId(user.id) ?? null
    : null;
  const legacyMerchant = isVerifiedMerchantAccount({
    author: authorName,
    username: displayUsername,
  });
  const showCouponSettings = Boolean(merchantProfile?.merchantProfileId);

  useEffect(() => {
    const draft = loadPublishDraft();
    if (!draft) {
      return;
    }

    setTitle(draft.title);
    setContent(draft.content);
    setCategorySelection(draft.categorySelection);
    if (showCouponSettings && draft.couponBinding.mode === "add") {
      setCouponBinding(draft.couponBinding);
    }
    setDraftRestored(true);
  }, [showCouponSettings]);

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      savePublishDraft({
        title,
        content,
        categorySelection,
        couponBinding: showCouponSettings ? couponBinding : { mode: "none" },
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    authLoading,
    categorySelection,
    content,
    couponBinding,
    showCouponSettings,
    title,
    user,
  ]);

  function handlePickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setImagePickError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }

    const invalidFiles = files.filter((file) => !file.type.startsWith("image/"));
    if (invalidFiles.length > 0) {
      setImagePickError("仅支持图片文件，请重新选择");
      return;
    }

    const nextFiles = files.slice(0, remaining);
    if (files.length > remaining) {
      setImagePickError(`最多还能添加 ${remaining} 张图片，已自动截取前 ${remaining} 张`);
    } else {
      setImagePickError("");
    }

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
    setImagePickError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || submitLockRef.current) {
      return;
    }

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent("/publish")}`);
      return;
    }

    if (!title.trim()) {
      setError("请填写标题");
      return;
    }

    if (!content.trim()) {
      setError("请填写内容");
      return;
    }

    if (showCouponSettings && couponBinding.mode === "add") {
      try {
        validatePublishCouponBinding(couponBinding);
      } catch (validationError) {
        setError(
          validationError instanceof Error
            ? validationError.message
            : "优惠券信息不完整",
        );
        return;
      }
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setError("");
    setSuccessNotice("");

    try {
      const result = await addPost({
        title,
        content,
        categorySelection,
        images: images.map((image) => image.file),
        couponBinding: showCouponSettings ? couponBinding : { mode: "none" },
      });

      clearPublishDraft();

      if (result.notice) {
        setSuccessNotice(result.notice);
      }

      router.push(`/posts/${result.post.id}`);
    } catch (submitError) {
      setError(formatPublishError(submitError));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-safe">
        <PageHeader title="发布帖子" backHref="/" />
        <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 pt-20 text-center">
          <p className="text-sm text-zinc-500">登录后即可发布帖子</p>
          <Link
            href={`/login?redirect=${encodeURIComponent("/publish")}`}
            className="mt-4 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white"
          >
            去登录
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-32 pb-safe">
      <PageHeader title="发布帖子" backHref="/" />

      <main className="px-4 pt-20">
        {draftRestored ? (
          <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-700 ring-1 ring-sky-100">
            已恢复上次未发布的文字内容（图片需重新选择）
          </p>
        ) : null}

        <form id="publish-form" onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              标题 <span className="text-rose-500">*</span>
            </label>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError("");
              }}
              placeholder="请输入帖子标题"
              disabled={submitting}
              className="w-full rounded-xl bg-zinc-50 px-3 py-3 text-base text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
            />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              分类
            </label>
            <div className="flex flex-wrap gap-2">
              {publishCategoryChoices.map((item) => {
                const isActive = categorySelection === item;

                return (
                  <button
                    key={item}
                    type="button"
                    disabled={submitting}
                    onClick={() => setCategorySelection(item)}
                    className={`min-h-9 touch-manipulation rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-60 ${
                      isActive
                        ? "bg-rose-500 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {publishCategoryLabels[item]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              内容 <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                setError("");
              }}
              placeholder="分享你的探店、房屋、招聘、攻略或求助信息..."
              rows={8}
              disabled={submitting}
              className="w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-base leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-300 disabled:opacity-60"
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
                    disabled={submitting}
                    className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-sm text-white touch-manipulation disabled:opacity-60"
                    aria-label="删除图片"
                  >
                    ×
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES ? (
                <label
                  htmlFor={fileInputId}
                  className={`flex aspect-square cursor-pointer items-center justify-center rounded-xl bg-zinc-50 text-2xl text-zinc-400 ring-1 ring-zinc-200 touch-manipulation transition-colors active:bg-zinc-100 ${
                    submitting ? "pointer-events-none opacity-60" : ""
                  }`}
                  aria-label="添加图片"
                >
                  +
                </label>
              ) : null}
            </div>

            {imagePickError ? (
              <p className="mt-2 text-xs text-rose-500">{imagePickError}</p>
            ) : null}

            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              disabled={submitting}
              className="sr-only"
              onChange={handlePickImages}
            />
          </section>

          {showCouponSettings ? (
            <PublishCouponSettings
              value={couponBinding}
              onChange={setCouponBinding}
              disabled={submitting}
            />
          ) : null}

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-600 ring-1 ring-rose-100">
              {error}
            </p>
          ) : null}

          {successNotice ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm leading-6 text-amber-700 ring-1 ring-amber-100">
              {successNotice}
            </p>
          ) : null}
        </form>
      </main>

      <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-zinc-100 bg-white/95 backdrop-blur-md pb-safe">
        <div className="mx-auto max-w-md px-4 py-3">
          <button
            type="submit"
            form="publish-form"
            disabled={submitting || authLoading}
            className="min-h-12 w-full touch-manipulation rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "发布中，请稍候..." : "发布"}
          </button>
        </div>
      </div>
    </div>
  );
}
