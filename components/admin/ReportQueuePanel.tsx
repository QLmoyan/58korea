"use client";

import { useCallback, useEffect, useState } from "react";
import {
  handleReportAction,
  listContentReportsAction,
  type AdminReportItem,
} from "@/lib/actions/admin-reports";
import AdminActionButtons from "@/components/admin/AdminActionButtons";
import AdminPostRiskLabelButtons, {
  resolveAdminPostId,
} from "@/components/admin/AdminPostRiskLabelButtons";
import {
  formatDateTime,
  REPORT_STATUS_LABELS,
  type ReportStatus,
} from "@/lib/types/admin";

const STATUS_FILTERS: Array<{ value: ReportStatus | "all"; label: string }> = [
  { value: "open", label: "待处理" },
  { value: "all", label: "全部" },
  { value: "resolved", label: "已处理" },
  { value: "dismissed", label: "已忽略" },
  { value: "reviewing", label: "处理中" },
];

export default function ReportQueuePanel() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const [items, setItems] = useState<AdminReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listContentReportsAction({ status: statusFilter });
      setItems(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function runAction(
    reportId: string,
    action: "resolve" | "dismiss" | "hide" | "delete",
    confirmMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setActingId(reportId);
    setError("");

    try {
      await handleReportAction({ reportId, action });
      await loadItems();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-rose-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-400">加载中...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-400 ring-1 ring-zinc-100">
          暂无举报记录
        </p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const adminPostId = resolveAdminPostId({
            targetType: item.targetType,
            targetId: item.targetId,
            postId: item.postId,
          });

          return (
          <article
            key={item.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {item.targetType === "post" ? "帖子" : "评论/回复"}
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                {item.reasonLabel}
              </span>
              <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-xs text-zinc-500">
                {REPORT_STATUS_LABELS[item.status]}
              </span>
            </div>

            <p className="mt-3 text-xs text-zinc-400">
              举报时间：{formatDateTime(item.createdAt)}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              目标 ID：{item.targetId}
              {item.postId ? ` · 帖子 #${item.postId}` : ""}
            </p>

            {item.detail ? (
              <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-700 ring-1 ring-zinc-100">
                补充说明：{item.detail}
              </p>
            ) : null}

            {item.targetPreview ? (
              <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-700 ring-1 ring-zinc-100 whitespace-pre-wrap">
                {item.targetPreview}
              </pre>
            ) : null}

            {item.postId ? (
              <a
                href={`/posts/${item.postId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs font-medium text-rose-500"
              >
                查看前台帖子
              </a>
            ) : null}

            <div className="mt-4 space-y-4">
              {adminPostId ? (
                <AdminPostRiskLabelButtons
                  postId={adminPostId}
                  disabled={actingId === item.id}
                />
              ) : null}

              <AdminActionButtons
                targetType={item.targetType}
                disabled={actingId === item.id}
                approveLabel="标记已处理"
                onApprove={() => runAction(item.id, "resolve")}
                onDismiss={() => runAction(item.id, "dismiss")}
                onHide={() =>
                  runAction(item.id, "hide", "确认隐藏该内容？前台将不再展示。")
                }
                onDelete={() =>
                  runAction(item.id, "delete", "确认删除该内容？此操作不可恢复。")
                }
              />
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
