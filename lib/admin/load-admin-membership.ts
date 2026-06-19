import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/admin/permissions";
import type { AdminMembership } from "@/lib/types/admin-auth";

type AdminUsersRow = {
  user_id: string;
  role: string;
  enabled: boolean;
};

export async function loadAdminMembership(
  userId: string,
): Promise<AdminMembership | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users" as never)
    .select("user_id, role, enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`加载管理员权限失败: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as AdminUsersRow;

  if (!isAdminRole(row.role)) {
    throw new Error("管理员角色无效");
  }

  return {
    userId: row.user_id,
    role: row.role,
    enabled: row.enabled,
  };
}
