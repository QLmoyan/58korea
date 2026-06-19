import { cookies } from "next/headers";
import {
  getAdminSessionCookieName,
  verifySessionToken,
} from "@/lib/admin/session";

export async function assertAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAdminSessionCookieName())?.value;
  const valid = await verifySessionToken(token);

  if (!valid) {
    throw new Error("未授权访问");
  }
}
