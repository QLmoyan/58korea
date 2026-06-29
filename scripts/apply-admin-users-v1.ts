import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
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

const POOLER_CLUSTERS = ["aws-0", "aws-1", "aws-2"] as const;
const POOLER_REGIONS = [
  "ap-northeast-2",
  "ap-northeast-1",
  "ap-southeast-1",
  "us-east-1",
  "us-east-2",
  "eu-west-1",
  "eu-central-1",
] as const;

function resolveDatabaseUrl(env: Record<string, string>) {
  if (env.SUPABASE_DB_URL) {
    return env.SUPABASE_DB_URL;
  }

  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const password = env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) {
    return null;
  }

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function buildConnectionCandidates(initialUrl: string) {
  const candidates = [initialUrl];

  try {
    const parsed = new URL(initialUrl);
    const projectRef = parsed.hostname.match(/^db\.(.+)\.supabase\.co$/)?.[1];
    if (!projectRef) {
      return candidates;
    }

    const password = decodeURIComponent(parsed.password);
    for (const cluster of POOLER_CLUSTERS) {
      for (const region of POOLER_REGIONS) {
        candidates.push(
          `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${cluster}-${region}.pooler.supabase.com:5432/postgres`,
        );
      }
    }
  } catch {
    return candidates;
  }

  return candidates;
}

function isConnectionError(message: string) {
  return /ENOTFOUND|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|Tenant or user not found/i.test(
    message,
  );
}

async function runMigrationSql(connectionString: string, migrationSql: string) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(migrationSql);
  } finally {
    await client.end();
  }
}

async function applyMigration(initialUrl: string, migrationSql: string) {
  const candidates = buildConnectionCandidates(initialUrl);
  const connectionErrors: string[] = [];

  for (const connectionString of candidates) {
    try {
      await runMigrationSql(connectionString, migrationSql);
      return connectionString;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isConnectionError(message)) {
        connectionErrors.push(message);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Database migration failed after trying ${candidates.length} connection(s).\n${connectionErrors.join("\n")}`,
  );
}

async function verifySchema(
  connectionString: string,
  supabase: ReturnType<typeof createClient<Database>>,
) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const columns = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND column_name IN ('username', 'bio')`,
    );

    const columnNames = new Set(columns.rows.map((row) => row.column_name));
    if (!columnNames.has("username") || !columnNames.has("bio")) {
      throw new Error(
        "profiles.username or profiles.bio column missing after migration",
      );
    }

    const adminTable = await client.query<{ regclass: string | null }>(
      "SELECT to_regclass('public.admin_users') AS regclass",
    );

    if (!adminTable.rows[0]?.regclass) {
      throw new Error("admin_users table missing after migration");
    }

    const rls = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'admin_users'`,
    );

    if (!rls.rows[0]?.relrowsecurity) {
      throw new Error("admin_users RLS is not enabled");
    }
  } finally {
    await client.end();
  }

  const errors: string[] = [];

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    errors.length = 0;

    const { error: adminUsersError } = await supabase
      .from("admin_users")
      .select("id")
      .limit(1);

    if (adminUsersError) {
      errors.push(`admin_users: ${adminUsersError.message}`);
    }

    if (errors.length === 0) {
      return;
    }

    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`Schema verification failed:\n${errors.join("\n")}`);
}

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  if (!databaseUrl) {
    throw new Error(
      "Missing database connection. Set SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD in .env.local",
    );
  }

  const sqlPath = resolve(process.cwd(), "scripts/apply-admin-users-v1.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");

  const connectionString = await applyMigration(databaseUrl, migrationSql);

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await verifySchema(connectionString, supabase);

  console.log("Admin Users V1 migration applied.");
  console.log("profiles.username and profiles.bio columns ready.");
  console.log("admin_users table ready with RLS enabled (no public policies).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
