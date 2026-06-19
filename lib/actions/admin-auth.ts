"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  getAdminSessionCookieName,
  getAdminSessionCookieOptions,
  isAdminConfigured,
  verifyAdminPassword,
} from "@/lib/admin/session";

export async function loginAdminAction(password: string) {
  if (!isAdminConfigured()) {
    throw new Error("后台未配置，请联系管理员");
  }

  if (!verifyAdminPassword(password)) {
    throw new Error("密码错误");
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(getAdminSessionCookieName(), token, getAdminSessionCookieOptions());
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.set(getAdminSessionCookieName(), "", {
    ...getAdminSessionCookieOptions(),
    maxAge: 0,
  });
  redirect("/admin/login");
}
