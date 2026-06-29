import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type User } from "@supabase/supabase-js";
import { normalizeUsername, toInternalEmail } from "../lib/auth/username";
import type { Database } from "../lib/supabase/database.types";

const ADMIN_USERNAME = "admin";
const ADMIN_NICKNAME = "站长";
const ADMIN_BIO = "韩圈管理员";
const ADMIN_ROLE = "owner" as const;

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

async function findUserByEmail(
  supabase: ReturnType<typeof createClient<Database>>,
  email: string,
): Promise<User | null> {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`List users failed: ${error.message}`);
    }

    const matched = data.users.find(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    );
    if (matched) {
      return matched;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const bootstrapPassword = env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  if (!bootstrapPassword) {
    throw new Error("Missing ADMIN_BOOTSTRAP_PASSWORD in .env.local");
  }

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const username = normalizeUsername(ADMIN_USERNAME);
  const email = toInternalEmail(username);

  let user = await findUserByEmail(supabase, email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: bootstrapPassword,
      email_confirm: true,
      user_metadata: {
        username,
        nickname: ADMIN_NICKNAME,
        bio: ADMIN_BIO,
      },
    });

    if (error) {
      throw new Error(`Create admin user failed: ${error.message}`);
    }

    user = data.user;
  }

  if (!user) {
    throw new Error("Admin user could not be resolved after bootstrap");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      nickname: ADMIN_NICKNAME,
      bio: ADMIN_BIO,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(`Upsert profile failed: ${profileError.message}`);
  }

  const { error: adminUserError } = await supabase
    .from("admin_users")
    .upsert(
      {
        user_id: user.id,
        role: ADMIN_ROLE,
        enabled: true,
      },
      { onConflict: "user_id" },
    );

  if (adminUserError) {
    throw new Error(`Upsert admin_users failed: ${adminUserError.message}`);
  }

  console.log(`admin user id: ${user.id}`);
  console.log(`username: ${username}`);
  console.log(`role: ${ADMIN_ROLE}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
