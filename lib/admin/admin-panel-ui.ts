import type { AdminPermission } from "@/lib/types/admin-auth";

export type AdminPanelTab =
  | "dashboard"
  | "reviews"
  | "reports"
  | "rules"
  | "tester"
  | "channelArticles"
  | "squareBanners";

export const ADMIN_PANEL_TABS: Array<{
  id: AdminPanelTab;
  label: string;
  permission: AdminPermission;
}> = [
  { id: "dashboard", label: "Dashboard", permission: "dashboard.read" },
  { id: "reviews", label: "审核队列", permission: "reviews.read" },
  { id: "reports", label: "举报记录", permission: "reports.read" },
  { id: "rules", label: "规则管理", permission: "rules.read" },
  { id: "tester", label: "规则测试器", permission: "rules.test" },
  { id: "channelArticles", label: "频道文章", permission: "channel_articles.read" },
  { id: "squareBanners", label: "广场 Banner", permission: "channel_articles.read" },
];

export function canAccessAdminPanelTab(
  permissions: AdminPermission[],
  tab: AdminPanelTab,
) {
  const config = ADMIN_PANEL_TABS.find((item) => item.id === tab);
  return config ? permissions.includes(config.permission) : false;
}

export function listAccessibleAdminPanelTabs(permissions: AdminPermission[]) {
  return ADMIN_PANEL_TABS.filter((tab) =>
    permissions.includes(tab.permission),
  );
}

export function canDeleteContentTarget(
  permissions: AdminPermission[],
  targetType: "post" | "comment",
) {
  return permissions.includes(
    targetType === "post" ? "content.post.delete" : "content.comment.delete",
  );
}
