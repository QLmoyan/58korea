/**
 * Verifies @supabase/ssr cookie flow: browser client writes cookies that server client can read.
 * Run: npx tsx scripts/verify-ssr-auth-cookies.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { listPermissions } from "../lib/admin/permissions";
import { loadAdminMembership } from "../lib/admin/load-admin-membership";

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

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

const env = loadEnv();
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
process.env.ADMIN_BOOTSTRAP_PASSWORD =
  process.env.ADMIN_BOOTSTRAP_PASSWORD ?? env.ADMIN_BOOTSTRAP_PASSWORD;
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_USER_ID = "99c60ace-7447-4765-878a-4c9c5134d2a6";

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
    names() {
      return [...store.keys()];
    },
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!url || !anonKey || !password) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or ADMIN_BOOTSTRAP_PASSWORD",
    );
  }

  const cookieStore = createCookieStore();

  const browserClient = createBrowserClient(url, anonKey, {
    cookies: cookieStore,
  });

  const { error: signInError } = await browserClient.auth.signInWithPassword({
    email: "admin@users.58korea.com",
    password,
  });

  if (signInError) {
    throw new Error(`signIn failed: ${signInError.message}`);
  }

  const authCookieNames = cookieStore.names().filter((name) => name.includes("auth"));
  console.log("Cookie names after browser signIn:", cookieStore.names());
  console.log("Auth cookie count:", authCookieNames.length);

  if (authCookieNames.length === 0) {
    throw new Error("No Supabase auth cookies written by createBrowserClient");
  }

  const serverClient = createServerClient(url, anonKey, {
    cookies: cookieStore,
  });

  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) {
    throw new Error(`getUser failed: ${userError?.message ?? "no user"}`);
  }

  console.log("getServerAuthUser equivalent user.id:", user.id);

  if (user.id !== ADMIN_USER_ID) {
    throw new Error(`Expected admin id ${ADMIN_USER_ID}, got ${user.id}`);
  }

  const membership = await loadAdminMembership(user.id);
  const permissions = membership?.enabled
    ? listPermissions(membership.role)
    : [];

  const capabilities = {
    isAdmin: Boolean(membership?.enabled),
    role: membership?.role ?? null,
    permissions,
  };

  console.log("getAdminCapabilitiesAction equivalent:", JSON.stringify(capabilities, null, 2));

  const required = [
    "content.post.risk_label",
    "content.post.hide",
    "content.post.delete",
  ] as const;

  for (const permission of required) {
    if (!capabilities.permissions.includes(permission)) {
      throw new Error(`Missing permission: ${permission}`);
    }
  }

  if (!capabilities.isAdmin || capabilities.role !== "owner") {
    throw new Error("Admin capabilities check failed");
  }

  console.log("verify-ssr-auth-cookies: OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
