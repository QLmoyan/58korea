"use server";

import { assertAdminPermission } from "@/lib/admin/assert-admin-access";
import { listPermissions } from "@/lib/admin/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { AdminPermission, AdminRole } from "@/lib/types/admin-auth";

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "nickname"
>;

export interface AdminUserListItem {
  id: string;
  userId: string;
  username: string | null;
  nickname: string | null;
  accountLabel: string;
  role: AdminRole;
  roleLabel: string;
  enabled: boolean;
  permissions: AdminPermission[];
  permissionSummary: string;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "站长",
  admin: "管理员",
  moderator: "审核员",
};

function formatAdminTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildPermissionSummary(role: AdminRole) {
  const permissions = listPermissions(role);
  if (permissions.length <= 6) {
    return permissions.join("、");
  }

  return `${permissions.slice(0, 6).join("、")} 等 ${permissions.length} 项`;
}

export async function listAdminUsersAction(): Promise<AdminUserListItem[]> {
  await assertAdminPermission("admins.manage");
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, user_id, role, enabled, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const userIds = rows.map((row) => row.user_id);

  const profileByUserId = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, nickname")
      .in("id", userIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profileByUserId.set(profile.id, profile);
    }
  }

  return rows.map((row) => {
    const profile = profileByUserId.get(row.user_id);
    const username = profile?.username?.trim() || null;
    const nickname = profile?.nickname?.trim() || null;
    const accountLabel = username ?? nickname ?? row.user_id.slice(0, 8);

    return {
      id: row.id,
      userId: row.user_id,
      username,
      nickname,
      accountLabel,
      role: row.role,
      roleLabel: ROLE_LABELS[row.role] ?? row.role,
      enabled: row.enabled,
      permissions: listPermissions(row.role),
      permissionSummary: buildPermissionSummary(row.role),
      createdAt: formatAdminTimestamp(row.created_at),
      updatedAt: formatAdminTimestamp(row.updated_at),
    };
  });
}
