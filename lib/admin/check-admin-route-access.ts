import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { hasPermission } from "@/lib/admin/permissions";
import { loadAdminMembership } from "@/lib/admin/load-admin-membership";
import {
  getAdminSessionCookieName,
  verifySessionToken,
} from "@/lib/admin/session";
import type { Database } from "@/lib/supabase/database.types";

async function getMiddlewareAuthUser(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only auth check for /admin route gating.
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function hasLegacyAdminSession(
  request: NextRequest,
): Promise<boolean> {
  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  return verifySessionToken(token);
}

export async function hasAccountAdminAccess(userId: string): Promise<boolean> {
  try {
    const membership = await loadAdminMembership(userId);
    if (!membership?.enabled) {
      return false;
    }

    return hasPermission(membership.role, "admin.access");
  } catch {
    return false;
  }
}

export async function canAccessAdminRoute(request: NextRequest): Promise<boolean> {
  if (await hasLegacyAdminSession(request)) {
    return true;
  }

  const user = await getMiddlewareAuthUser(request);
  if (!user) {
    return false;
  }

  return hasAccountAdminAccess(user.id);
}
