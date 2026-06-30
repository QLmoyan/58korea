"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveMerchantApplicationAction,
  listMerchantApplicationsAction,
  rejectMerchantApplicationAction,
  type AdminMerchantApplicationItem,
} from "@/lib/actions/admin-merchant-applications";
import { useAdminCapabilities } from "@/components/admin/AdminCapabilitiesProvider";
import { formatDateTime } from "@/lib/types/admin";
import type { MerchantApplicationStatus } from "@/lib/types/merchant-application";

const STATUS_FILTERS: Array<{
  value: MerchantApplicationStatus | "all";
  label: string;
}> = [
  { value: "pending", label: "待审核" },
  { value: "all", label: "全部" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
];

const STATUS_LABELS: Record<MerchantApplicationStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
};

export default function MerchantApplicationsPanel() {
  const { permissions } = useAdminCapabilities();
  const canReview = permissions.includes("reviews.write");
  const [statusFilter, setStatusFilter] = useState<MerchantApplicationStatus | "all">(
    "pending",
  );
  const [items, setItems] = useState<AdminMerchantApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listMerchantApplicationsAction({ status: statusFilter });
      setItems(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleApprove(applicationId: string) {
    if (!window.confirm("确认通过该商家认证申请？")) {
      return;
    }

    setActingId(applicationId);
    setError("");

    try {
      await approveMerchantApplicationAction(applicationId);
      await loadItems();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(applicationId: string) {
    const rejectReason = (rejectReasonById[applicationId] ?? "").trim();
    if (!rejectReason) {
      setError("请填写拒绝原因");
      return;
    }

    if (!window.confirm("确认拒绝该商家认证申请？")) {
      return;
    }

    setActingId(applicationId);
    setError("");

    try {
      await rejectMerchantApplicationAction({ applicationId, rejectReason });
      await loadItems();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "操作失败");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">商家认证申请</h2>
        <p className="mt-1 text-xs text-zinc-500">
          审核通过后自动开通 merchant_profiles 并标记 is_verified
        </p>
      </div>

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
        <p className="text-sm text-zinc-400">暂无申请记录</p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const expanded = expandedId === item.id;
          const acting = actingId === item.id;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">
                    {item.businessName}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.applicantNickname || "未设置昵称"}
                    {item.applicantUsername ? ` @${item.applicantUsername}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    提交于 {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  {STATUS_LABELS[item.status]}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : item.id)}
                className="mt-3 text-xs font-medium text-rose-500 hover:text-rose-600"
              >
                {expanded ? "收起详情" : "查看详情"}
              </button>

              {expanded ? (
                <dl className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-sm">
                  <DetailRow label="行业分类" value={item.category} />
                  <DetailRow label="店铺地址" value={item.address} />
                  <DetailRow label="联系方式" value={item.contact} />
                  <DetailRow label="证明说明" value={item.proofNote || "未填写"} />
                  {item.rejectReason ? (
                    <DetailRow label="拒绝原因" value={item.rejectReason} />
                  ) : null}
                  {item.reviewedAt ? (
                    <DetailRow
                      label="审核时间"
                      value={formatDateTime(item.reviewedAt)}
                    />
                  ) : null}
                </dl>
              ) : null}

              {item.status === "pending" && canReview ? (
                <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
                  <label className="block space-y-1">
                    <span className="text-xs text-zinc-500">拒绝原因（拒绝时必填）</span>
                    <input
                      value={rejectReasonById[item.id] ?? ""}
                      onChange={(event) =>
                        setRejectReasonById((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-rose-300"
                      placeholder="例如：资料不完整"
                      maxLength={200}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void handleApprove(item.id)}
                      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {acting ? "处理中..." : "通过"}
                    </button>
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => void handleReject(item.id)}
                      className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-60"
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ) : item.status === "pending" ? (
                <p className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
                  你仅有查看权限，审核操作需 admin/owner 执行
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-700">{value}</dd>
    </div>
  );
}
