import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";

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

async function loadProfileLikeApp(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function testUserLogin(
  supabase: ReturnType<typeof createClient>,
  label: string,
  username: string,
  password: string,
) {
  const email = toInternalEmail(username);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  assert(!signInError, `${label} sign in failed: ${signInError?.message}`);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  assert(!userError, `${label} getUser failed: ${userError?.message}`);
  assert(user?.id, `${label} missing user id after sign in`);

  const profile = await loadProfileLikeApp(supabase, user.id);
  assert(profile?.id === user.id, `${label} loadProfile returned wrong id`);

  const { error: signOutError } = await supabase.auth.signOut();
  assert(!signOutError, `${label} sign out failed: ${signOutError?.message}`);

  console.log(`OK ${label}: signIn + loadProfile`);
  return user.id;
}

async function testAnonBlocked(url: string, anonKey: string) {
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await anon.from("profiles").select("id").limit(1);
  assert(error, "anon should not read profiles");
  console.log("OK anon blocked from profiles SELECT");
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminPassword = env.ADMIN_BOOTSTRAP_PASSWORD;
  const testUsername = env.TEST_USER_USERNAME;
  const testPassword = env.TEST_USER_PASSWORD;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assert(adminPassword, "Missing ADMIN_BOOTSTRAP_PASSWORD");

  await testAnonBlocked(url, anonKey);

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (testUsername && testPassword) {
    await testUserLogin(supabase, "normal user", testUsername, testPassword);
  } else {
    const stamp = Date.now();
    const username = `test_${String(stamp).slice(-8)}`;
    const password = "Test123456!";
    const nickname = `测试${String(stamp).slice(-4)}`;

    await registerUserAction({
      username,
      password,
      nickname,
      bio: "profiles login test",
    });

    await testUserLogin(supabase, "normal user", username, password);
  }

  await testUserLogin(supabase, "admin", "admin", adminPassword);

  console.log("\nProfiles login verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
