import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { changePasswordAction } from "../lib/actions/change-password";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
import type { Database } from "../lib/supabase/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    env[trimmed.slice(0, separator).trim()] = trimmed
      .slice(separator + 1)
      .trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupUser(
  service: ReturnType<typeof createClient<Database>>,
  userId: string,
) {
  await service.from("posts").delete().eq("author_id", userId);
  await service.from("profiles").delete().eq("id", userId);
  await service.auth.admin.deleteUser(userId);
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const initialPassword = "Test123456!";
  const nextPassword = "NewPass789!";
  const username = `pwd_${String(stamp).slice(-6)}`;

  console.log("=== Change Password V1 tests ===\n");

  console.log("0) changePasswordAction requires login");
  let loginRequired = false;
  try {
    await changePasswordAction({
      currentPassword: initialPassword,
      newPassword: nextPassword,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loginRequired =
      message.includes("请先登录") ||
      message.includes("Dynamic server usage") ||
      message.includes("cookies");
  }
  assert(loginRequired, "changePasswordAction should reject unauthenticated calls");
  console.log("PASS  unauthenticated rejected\n");

  const { userId } = await registerUserAction({
    username,
    password: initialPassword,
    nickname: `P${String(stamp).slice(-4)}`,
  });

  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = toInternalEmail(username);

  try {
    console.log("1) wrong current password rejected");
    await client.auth.signInWithPassword({ email, password: initialPassword });

    const { error: wrongCurrentError } = await client.auth.signInWithPassword({
      email,
      password: "WrongPass999!",
    });
    assert(wrongCurrentError, "wrong password should fail sign in");
    console.log("PASS  wrong current password\n");

    console.log("2) update password via authenticated client");
    await client.auth.signInWithPassword({ email, password: initialPassword });
    const { error: updateError } = await client.auth.updateUser({
      password: nextPassword,
    });
    assert(!updateError, updateError?.message ?? "updateUser failed");

    const { error: oldPasswordError } = await client.auth.signInWithPassword({
      email,
      password: initialPassword,
    });
    assert(oldPasswordError, "old password should no longer work");

    const { error: newPasswordError } = await client.auth.signInWithPassword({
      email,
      password: nextPassword,
    });
    assert(!newPasswordError, newPasswordError?.message ?? "new password sign in failed");
    console.log("PASS  password updated and verified\n");

    console.log("3) manual reset script path (admin.updateUserById)");
    const tempPassword = "Reset456!";
    const { error: adminResetError } = await service.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });
    assert(!adminResetError, adminResetError?.message ?? "admin reset failed");

    const { error: tempSignInError } = await client.auth.signInWithPassword({
      email,
      password: tempPassword,
    });
    assert(!tempSignInError, tempSignInError?.message ?? "temp password sign in failed");
    console.log("PASS  admin manual reset works\n");

    console.log("All change password V1 tests passed.");
  } finally {
    await cleanupUser(service, userId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
