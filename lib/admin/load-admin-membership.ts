import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminRole } from "@/lib/admin/permissions";
import type { AdminMembership } from "@/lib/types/admin-auth";

export async function loadAdminMembership(
  userId: string,
): Promise<AdminMembership | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, role, enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`加载管理员权限失败: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  if (!isAdminRole(data.role)) {
    throw new Error("管理员角色无效");
  }

  return {
    userId: data.user_id,
    role: data.role,
    enabled: data.enabled,
  };
}
