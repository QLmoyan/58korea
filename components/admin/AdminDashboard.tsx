"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAdminAction } from "@/lib/actions/admin-auth";
import {
  canAccessAdminPanelTab,
  listAccessibleAdminPanelTabs,
  type AdminPanelTab,
} from "@/lib/admin/admin-panel-ui";
import MerchantApplicationsPanel from "@/components/admin/MerchantApplicationsPanel";
import ReportQueuePanel from "@/components/admin/ReportQueuePanel";
import ReviewQueuePanel from "@/components/admin/ReviewQueuePanel";
import RulesManagementPanel from "@/components/admin/rules/RulesManagementPanel";
import RuleTesterPanel from "@/components/admin/rules/RuleTesterPanel";
import ChannelArticlesPanel from "@/components/admin/ChannelArticlesPanel";
import SquareBannersPanel from "@/components/admin/SquareBannersPanel";
import DashboardPanel from "@/components/admin/DashboardPanel";
import { useAdminCapabilities } from "@/components/admin/AdminCapabilitiesProvider";

export default function AdminDashboard() {
  const { permissions } = useAdminCapabilities();
  const searchParams = useSearchParams();
  const accessibleTabs = listAccessibleAdminPanelTabs(permissions);
  const [tab, setTab] = useState<AdminPanelTab>("dashboard");
  const [loggingOut, setLoggingOut] = useState(false);
  const canManageAdmins = permissions.includes("admins.manage");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      canAccessAdminPanelTab(permissions, tabParam as AdminPanelTab)
    ) {
      setTab(tabParam as AdminPanelTab);
    }
  }, [permissions, searchParams]);

  useEffect(() => {
    if (accessibleTabs.length === 0) {
      return;
    }

    if (!canAccessAdminPanelTab(permissions, tab)) {
      setTab(accessibleTabs[0].id);
    }
  }, [accessibleTabs, permissions, tab]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutAdminAction();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-4 lg:px-6">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">韩圈运营后台</h1>
            <p className="text-xs text-zinc-500">运营概览、内容安全审核、举报处理、规则管理与测试</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageAdmins ? (
              <Link
                href="/admin/admins"
                className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
              >
                管理员管理
              </Link>
            ) : null}
            {permissions.includes("channel_articles.read") ? (
              <Link
                href="/admin/discovery-content"
                className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
              >
                发现页内容编辑
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-60"
            >
              {loggingOut ? "退出中..." : "退出"}
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4 lg:px-6">
          {accessibleTabs.map((item) => (
            <TabButton
              key={item.id}
              active={tab === item.id}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </TabButton>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 lg:px-6 lg:py-6">
        {tab === "dashboard" && canAccessAdminPanelTab(permissions, "dashboard") ? (
          <DashboardPanel />
        ) : null}
        {tab === "reviews" && canAccessAdminPanelTab(permissions, "reviews") ? (
          <ReviewQueuePanel />
        ) : null}
        {tab === "merchantApplications" &&
        canAccessAdminPanelTab(permissions, "merchantApplications") ? (
          <MerchantApplicationsPanel />
        ) : null}
        {tab === "reports" && canAccessAdminPanelTab(permissions, "reports") ? (
          <ReportQueuePanel />
        ) : null}
        {tab === "rules" && canAccessAdminPanelTab(permissions, "rules") ? (
          <RulesManagementPanel />
        ) : null}
        {tab === "tester" && canAccessAdminPanelTab(permissions, "tester") ? (
          <RuleTesterPanel />
        ) : null}
        {tab === "channelArticles" &&
        canAccessAdminPanelTab(permissions, "channelArticles") ? (
          <ChannelArticlesPanel />
        ) : null}
        {tab === "squareBanners" &&
        canAccessAdminPanelTab(permissions, "squareBanners") ? (
          <SquareBannersPanel />
        ) : null}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-rose-500 text-white shadow-sm"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
