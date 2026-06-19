"use server";

import { cookies } from "next/headers";
import { listPermissions, hasPermission } from "@/lib/admin/permissions";
import { loadAdminMembership } from "@/lib/admin/load-admin-membership";
import {
  getAdminSessionCookieName,
  verifySessionToken,
} from "@/lib/admin/session";
import { getServerAuthUser } from "@/lib/supabase/server";
import type { AdminPermission, AdminRole } from "@/lib/types/admin-auth";

export interface AdminCapabilities {
  isAdmin: boolean;
  role: AdminRole | null;
  permissions: AdminPermission[];
}

export async function getAdminCapabilitiesAction(): Promise<AdminCapabilities> {
  const user = await getServerAuthUser();

  if (!user) {
    return { isAdmin: false, role: null, permissions: [] };
  }

  try {
    const membership = await loadAdminMembership(user.id);

    if (!membership?.enabled) {
      return { isAdmin: false, role: null, permissions: [] };
    }

    if (!hasPermission(membership.role, "admin.access")) {
      return { isAdmin: false, role: null, permissions: [] };
    }

    return {
      isAdmin: true,
      role: membership.role,
      permissions: listPermissions(membership.role),
    };
  } catch {
    return { isAdmin: false, role: null, permissions: [] };
  }
}

/** Admin panel UI: Supabase account auth, with legacy /admin password cookie fallback. */
export async function getAdminPanelCapabilitiesAction(): Promise<AdminCapabilities> {
  const accountCapabilities = await getAdminCapabilitiesAction();

  if (accountCapabilities.isAdmin) {
    return accountCapabilities;
  }

  try {
    const cookieStore = await cookies();
    const legacyToken = cookieStore.get(getAdminSessionCookieName())?.value;

    if (await verifySessionToken(legacyToken)) {
      return {
        isAdmin: true,
        role: "owner",
        permissions: listPermissions("owner"),
      };
    }
  } catch {
    // fall through
  }

  return { isAdmin: false, role: null, permissions: [] };
}
