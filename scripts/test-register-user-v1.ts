import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { registerUserAction } from "../lib/actions/register-user";
import { loadAdminMembership } from "../lib/admin/load-admin-membership";
import { publishCommentAction, publishPostAction } from "../lib/actions/publish-content";
import { toInternalEmail } from "../lib/auth/username";
import type { Database } from "../lib/supabase/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const env: Record<string, string> = {};

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
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
  if (!condition) throw new Error(message);
}

function createCookieStore() {
  const store = new Map<string, string>();
  return {
    getAll() {
      return [...store.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(cookiesToSet: { name: string; value: string }[]) {
      for (const { name, value } of cookiesToSet) {
        store.set(name, value);
      }
    },
    cookieHeader() {
      return [...store.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
  };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const baseUrl = process.env.REGRESSION_BASE_URL ?? "http://localhost:3000";

  const stamp = Date.now();
  const username = `reg${String(stamp).slice(-7)}`;
  const password = "Test123456!";
  const nickname = `用户${String(stamp).slice(-4)}`;
  const bio = "注册测试 bio";
  const email = toInternalEmail(username);

  console.log(`TEST_USERNAME=${username}`);
  console.log(`TEST_EMAIL=${email}`);

  const { userId } = await registerUserAction({
    username,
    password,
    nickname,
    bio,
  });
  assert(userId, "registerUserAction missing userId");
  console.log("OK registerUserAction");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authUser, error: authUserError } =
    await service.auth.admin.getUserById(userId);
  assert(!authUserError && authUser.user, `auth user missing: ${authUserError?.message}`);
  assert(authUser.user.email === email, `auth email mismatch: ${authUser.user.email}`);
  console.log("OK auth.users internal email");

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, username, nickname, bio")
    .eq("id", userId)
    .single();
  assert(!profileError, profileError?.message ?? "profile missing");
  assert(profile.username === username, "profile.username mismatch");
  assert(profile.nickname === nickname, "profile.nickname mismatch");
  assert(profile.bio === bio, "profile.bio mismatch");
  console.log("OK profiles row");

  const cookieStore = createCookieStore();
  const browser = createBrowserClient<Database>(url, anonKey, {
    cookies: cookieStore,
  });

  const signIn = await browser.auth.signInWithPassword({ email, password });
  assert(!signIn.error, `signIn failed: ${signIn.error?.message}`);
  assert(signIn.data.session, "missing session after signIn");
  console.log("OK signIn after register");

  const server = createServerClient<Database>(url, anonKey, {
    cookies: cookieStore,
  });
  const { data: authedProfile } = await server
    .from("profiles")
    .select("id, nickname, username, bio")
    .eq("id", userId)
    .maybeSingle();
  assert(authedProfile?.id === userId, "authenticated profile read failed");
  console.log("OK authenticated profile read");

  await browser.auth.signOut();
  const signInAgain = await browser.auth.signInWithPassword({ email, password });
  assert(!signInAgain.error, `re-login failed: ${signInAgain.error?.message}`);
  console.log("OK re-login after signOut");

  const postResult = await publishPostAction({
    title: `reg user post ${stamp}`,
    content: "register user publish test",
    category: "其他",
    author: nickname,
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });
  assert(postResult.post.id, "publishPostAction failed");
  console.log(`OK publishPostAction post_id=${postResult.post.id}`);

  const commentResult = await publishCommentAction({
    id: randomUUID(),
    postId: postResult.post.id,
    author: nickname,
    content: "register user comment test",
  });
  assert(commentResult.comment.id, "publishCommentAction failed");
  console.log("OK publishCommentAction");

  const membership = await loadAdminMembership(userId);
  assert(!membership?.enabled, "new user should not be admin");
  console.log("OK new user is not in admin_users");

  const adminRes = await fetch(`${baseUrl}/admin`, {
    headers: { Cookie: cookieStore.cookieHeader() },
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  assert(
    adminRes.status >= 300 && adminRes.status < 400,
    `/admin should redirect, got ${adminRes.status}`,
  );
  console.log("OK /admin blocked for new user");

  await service.from("content_reviews").delete().eq("post_id", postResult.post.id);
  await service.from("comments").delete().eq("id", commentResult.comment.id);
  await service.from("posts").delete().eq("id", postResult.post.id);
  await service.from("profiles").delete().eq("id", userId);
  await service.auth.admin.deleteUser(userId);
  console.log("OK cleanup test user");

  console.log("\nPASS: scripts/test-register-user-v1.ts");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
