import { cookies } from "next/headers";
import { hasPermission } from "@/lib/admin/permissions";
import { loadAdminMembership } from "@/lib/admin/load-admin-membership";
import {
  getAdminSessionCookieName,
  verifySessionToken,
} from "@/lib/admin/session";
import { getServerAuthUser } from "@/lib/supabase/server";
import type { AdminActor, AdminPermission } from "@/lib/types/admin-auth";

const UNAUTHORIZED_MESSAGE = "未授权访问";

export async function assertAdminPermission(
  permission: AdminPermission,
): Promise<AdminActor> {
  const user = await getServerAuthUser();

  if (user) {
    const membership = await loadAdminMembership(user.id);

    if (membership?.enabled) {
      if (hasPermission(membership.role, permission)) {
        return {
          kind: "account",
          userId: user.id,
          role: membership.role,
        };
      }

      throw new Error(UNAUTHORIZED_MESSAGE);
    }
  }

  const cookieStore = await cookies();
  const legacyToken = cookieStore.get(getAdminSessionCookieName())?.value;

  if (await verifySessionToken(legacyToken)) {
    if (hasPermission("owner", permission)) {
      return {
        kind: "legacy_password",
        role: "owner",
      };
    }

    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  throw new Error(UNAUTHORIZED_MESSAGE);
}
