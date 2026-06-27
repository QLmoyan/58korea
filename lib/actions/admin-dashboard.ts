"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { computeAdminDashboardStats } from "@/lib/admin/dashboard-stats";
import type { AdminDashboardStats } from "@/lib/types/admin-dashboard";

export async function getAdminDashboardStatsAction(): Promise<AdminDashboardStats> {
  await assertAdminPermission("dashboard.read");
  return computeAdminDashboardStats();
}
