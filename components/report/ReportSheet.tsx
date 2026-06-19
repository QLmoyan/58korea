"use client";

import { useEffect, useState } from "react";
import { submitReportAction } from "@/lib/actions/report-content";
import { getReporterKey } from "@/lib/local/reporter-key";
import {
  REPORT_REASONS,
  REPORT_SUCCESS_MESSAGE,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/types/report";

interface ReportSheetProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  postId: number;
  targetLabel: string;
}

export default function ReportSheet({
  open,
  onClose,
  targetType,
  targetId,
  postId,
  targetLabel,
}: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setDetail("");
      setError("");
      setSuccessMessage("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason) {
      setError("请选择举报原因");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await submitReportAction({
        targetType,
        targetId,
        postId,
        reason,
        detail: reason === "other" ? detail : undefined,
        reporterKey: getReporterKey(),
      });

      setSuccessMessage(result.message || REPORT_SUCCESS_MESSAGE);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "举报提交失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 px-4 pb-4 pt-16">
      <button
        type="button"
        aria-label="关闭举报"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-100">
        <div className="border-b border-zinc-100 px-4 py-4">
          <h2 className="text-base font-semibold text-zinc-900">举报内容</h2>
          <p className="mt-1 text-xs text-zinc-500">{targetLabel}</p>
        </div>

        {successMessage ? (
          <div className="space-y-4 px-4 py-6">
            <p className="text-center text-sm leading-6 text-emerald-600">
              {successMessage}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-zinc-100 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
            >
              关闭
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {REPORT_REASONS.map((item) => {
                const isActive = reason === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setReason(item.value);
                      setError("");
                    }}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all touch-manipulation ${
                      isActive
                        ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                        : "bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {reason === "other" ? (
              <textarea
                value={detail}
                onChange={(event) => {
                  setDetail(event.target.value);
                  setError("");
                }}
                placeholder="请补充说明（必填）"
                rows={3}
                maxLength={200}
                className="mt-3 w-full resize-none rounded-xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-200"
              />
            ) : null}

            {error ? (
              <p className="mt-3 text-center text-xs text-rose-500">{error}</p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 rounded-full bg-zinc-100 py-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "提交中..." : "提交举报"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
