/**
 * Manual password reset for 58korea (Plan A — operator only).
 *
 * Usage:
 *   npx tsx scripts/reset-user-password.ts <username> <new-password>
 *
 * SOP:
 * 1. User contacts support with their username (and identity hints).
 * 2. Operator verifies identity out-of-band (WeChat / known posts / etc.).
 * 3. Run this script locally with service_role (never expose to frontend).
 * 4. Tell the user the temporary new password; ask them to log in and change it
 *    at /profile/edit after login.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeUsername, toInternalEmail, validateUsername } from "../lib/auth/username";
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

    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[trimmed.slice(0, separator).trim()] = value;
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

async function main() {
  const usernameArg = process.argv[2];
  const newPassword = process.argv[3];

  if (!usernameArg || !newPassword) {
    console.error("Usage: npx tsx scripts/reset-user-password.ts <username> <new-password>");
    process.exit(1);
  }

  const usernameError = validateUsername(usernameArg);
  if (usernameError) {
    throw new Error(usernameError);
  }

  if (newPassword.length < 6) {
    throw new Error("新密码至少 6 位");
  }

  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceRoleKey, "Missing Supabase env vars in .env.local");

  const username = normalizeUsername(usernameArg);
  const email = toInternalEmail(username);

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, nickname")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.id) {
    throw new Error(`未找到用户名：${username}`);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });

  if (updateError) {
    throw new Error(`重置失败: ${updateError.message}`);
  }

  console.log("Password reset successful.");
  console.log(`  username: ${profile.username}`);
  console.log(`  nickname: ${profile.nickname ?? "(none)"}`);
  console.log(`  auth email: ${email}`);
  console.log(`  user_id: ${profile.id}`);
  console.log("\n请通过安全渠道将新密码告知用户，并提醒其登录后在「编辑资料」修改密码。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
