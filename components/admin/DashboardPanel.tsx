"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminDashboardStatsAction } from "@/lib/actions/admin-dashboard";
import type { AdminDashboardStats } from "@/lib/types/admin-dashboard";

function formatStatValue(value: number | null, unavailableLabel = "暂无") {
  if (value === null) {
    return unavailableLabel;
  }

  return value.toLocaleString("zh-CN");
}

function StatCard({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: number | null;
  hint?: string;
  tooltip?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
      title={tooltip}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
        {formatStatValue(value)}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function StatSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export default function DashboardPanel() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAdminDashboardStatsAction();
      setStats(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-100 bg-white p-8 text-center text-sm text-zinc-500">
        正在加载 Dashboard 统计...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6">
        <p className="text-sm font-medium text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => void loadStats()}
          className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-medium text-rose-600 shadow-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const updatedAt = new Date(stats.generatedAt).toLocaleString("zh-CN", {
    timeZone: stats.timezone,
  });

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">运营 Dashboard</h2>
            <p className="mt-1 text-xs text-zinc-500">
              数字卡片概览 · 时区 {stats.timezone} · 更新于 {updatedAt}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadStats()}
            className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
          >
            刷新
          </button>
        </div>
      </div>

      <StatSection
        title="用户"
        description="DAU / WAU / MAU 按用户去重：登录、已登录用户浏览帖子、发帖、评论、点赞、收藏、领券/核销"
      >
        <StatCard label="累计用户" value={stats.users.total} />
        <StatCard label="今日新增用户" value={stats.users.newToday} />
        <StatCard
          label="DAU"
          value={stats.users.dau}
          hint="今日（Asia/Seoul）"
          tooltip="今日至少有一次：登录、已登录用户浏览帖子、发帖、评论、点赞、收藏、领券或核销"
        />
        <StatCard
          label="WAU（7 天）"
          value={stats.users.wau}
          hint="含今日共 7 个自然日"
          tooltip="近 7 个自然日内至少有一次：登录、已登录用户浏览帖子、发帖、评论、点赞、收藏、领券或核销"
        />
        <StatCard
          label="MAU（30 天）"
          value={stats.users.mau}
          hint="含今日共 30 个自然日"
          tooltip="近 30 个自然日内至少有一次：登录、已登录用户浏览帖子、发帖、评论、点赞、收藏、领券或核销"
        />
      </StatSection>

      <StatSection title="内容">
        <StatCard label="今日发帖" value={stats.content.postsToday} />
        <StatCard label="今日评论" value={stats.content.commentsToday} />
      </StatSection>

      <StatSection
        title="商家"
        description="已认证商家 = is_active 的 merchant_profiles；今日活跃 = 发帖 / 编辑优惠券 / 核销优惠券"
      >
        <StatCard label="商家总数" value={stats.merchants.total} />
        <StatCard label="已认证商家" value={stats.merchants.certified} />
        <StatCard label="今日活跃商家" value={stats.merchants.activeToday} />
      </StatSection>

      <StatSection title="优惠券">
        <StatCard label="今日发布" value={stats.coupons.publishedToday} />
        <StatCard label="今日领取" value={stats.coupons.claimedToday} />
        <StatCard label="今日核销" value={stats.coupons.redeemedToday} />
      </StatSection>

      <StatSection title="运营">
        <StatCard
          label="待审核帖子"
          value={stats.operations.pendingReviewPosts}
          hint="moderation_status = pending_review"
        />
        <StatCard
          label="待处理举报"
          value={stats.operations.pendingReports}
          hint="content_reports.status = open"
        />
      </StatSection>
    </div>
  );
}
