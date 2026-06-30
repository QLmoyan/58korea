"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import {
  getMerchantApplyUiStateAction,
  submitMerchantApplicationAction,
} from "@/lib/actions/merchant-application";
import { buildLoginHref } from "@/lib/auth/redirect";
import { MERCHANT_CATEGORIES, type MerchantCategory } from "@/lib/merchant/categories";
import { useAuthStore } from "@/lib/store/auth-store";

export default function MerchantApplyContent() {
  const router = useRouter();
  const { user, loading } = useAuthStore();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<MerchantCategory>(MERCHANT_CATEGORIES[0]);
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(buildLoginHref("/merchant/apply"));
    }
  }, [loading, user, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      if (!user) {
        setInitializing(false);
        return;
      }

      try {
        const state = await getMerchantApplyUiStateAction();
        if (cancelled) {
          return;
        }

        if (state.kind === "verified") {
          setStatusMessage(`你已是认证商家（${state.businessName}）`);
        } else if (state.kind === "pending") {
          setStatusMessage(
            `你已有审核中的申请（${state.application.businessName}），请耐心等待`,
          );
        } else if (state.kind === "rejected") {
          setBusinessName(state.application.businessName);
          setCategory(
            MERCHANT_CATEGORIES.includes(
              state.application.category as MerchantCategory,
            )
              ? (state.application.category as MerchantCategory)
              : MERCHANT_CATEGORIES[0],
          );
          setAddress(state.application.address);
          setContact(state.application.contact);
          setProofNote(state.application.proofNote ?? "");
          setStatusMessage(
            `上次申请未通过：${state.application.rejectReason || "未说明"}。你可以修改后重新提交。`,
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "加载失败");
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await submitMerchantApplicationAction({
        businessName,
        category,
        address,
        contact,
        proofNote,
      });
      router.push("/profile");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  const blocked =
    statusMessage.includes("已是认证商家") ||
    statusMessage.includes("审核中的申请");

  return (
    <div className="min-h-screen bg-zinc-50">
      <PageHeader title="商家认证申请" backHref="/profile" />
      <main className="mx-auto max-w-lg px-4 py-5">
        {initializing ? (
          <p className="text-sm text-zinc-400">加载中...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
            <p className="text-sm text-zinc-500">
              请填写真实店铺信息，平台将在人工审核后开通认证商家身份。
            </p>

            {statusMessage ? (
              <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {statusMessage}
              </p>
            ) : null}

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">店铺名称</span>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                disabled={blocked || submitting}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 disabled:bg-zinc-50"
                placeholder="例如：江南韩牛烤肉"
                maxLength={80}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">行业分类</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as MerchantCategory)
                }
                disabled={blocked || submitting}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 disabled:bg-zinc-50"
                required
              >
                {MERCHANT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">店铺地址</span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={blocked || submitting}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 disabled:bg-zinc-50"
                placeholder="例如：首尔 江南区 ..."
                maxLength={200}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">联系方式</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                disabled={blocked || submitting}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 disabled:bg-zinc-50"
                placeholder="电话 / Kakao / 微信"
                maxLength={120}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">证明说明</span>
              <textarea
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                disabled={blocked || submitting}
                className="min-h-24 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300 disabled:bg-zinc-50"
                placeholder="可补充营业执照、门店照片链接或经营说明（选填）"
                maxLength={500}
              />
            </label>

            {error ? <p className="text-sm text-rose-500">{error}</p> : null}

            <button
              type="submit"
              disabled={blocked || submitting}
              className="w-full rounded-full bg-rose-500 py-3 text-sm font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "提交中..." : "提交申请"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
