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
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }

  return env;
}

function resolveDatabaseUrl(env: Record<string, string>) {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const password = env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) return null;

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
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

function buildConnectionCandidates(initialUrl: string) {
  const candidates = [initialUrl];

  try {
    const parsed = new URL(initialUrl);
    const projectRef = parsed.hostname.match(/^db\.(.+)\.supabase\.co$/)?.[1];
    if (!projectRef) return candidates;

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

async function withFirstWorkingConnection<T>(
  initialUrl: string,
  fn: (connectionString: string) => Promise<T>,
) {
  const candidates = buildConnectionCandidates(initialUrl);
  const connectionErrors: string[] = [];

  for (const connectionString of candidates) {
    try {
      return await fn(connectionString);
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
    `Database operation failed after trying ${candidates.length} connection(s).\n${connectionErrors.join("\n")}`,
  );
}

async function applyMigration(connectionString: string, migrationSql: string) {
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
  return connectionString;
}

async function inspectState(client: pg.Client) {
  const rls = await client.query<{ relrowsecurity: boolean }>(
    `SELECT c.relrowsecurity
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'merchant_applications'`,
  );

  const policies = await client.query<{ policyname: string; cmd: string }>(
    `SELECT policyname, cmd
     FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'merchant_applications'
     ORDER BY policyname`,
  );

  const columns = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'merchant_profiles'
       AND column_name IN ('category', 'is_verified')
     ORDER BY column_name`,
  );

  return {
    rlsEnabled: rls.rows[0]?.relrowsecurity ?? false,
    policies: policies.rows,
    merchantProfileColumns: columns.rows.map((row) => row.column_name),
  };
}

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!databaseUrl) {
    throw new Error("Missing database connection in .env.local");
  }

  if (!url || !anonKey) {
    throw new Error("Missing Supabase URL or anon key in .env.local");
  }

  const sqlPath = resolve(process.cwd(), "scripts/apply-merchant-applications-v1.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");
  const connectionString = await withFirstWorkingConnection(databaseUrl, (conn) =>
    applyMigration(conn, migrationSql),
  );

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const state = await inspectState(client);
    console.log("\n=== merchant_applications ===");
    console.log(`RLS enabled: ${state.rlsEnabled}`);
    console.log(`merchant_profiles columns: ${state.merchantProfileColumns.join(", ")}`);
    for (const policy of state.policies) {
      console.log(`- ${policy.policyname}: ${policy.cmd}`);
    }

    if (!state.rlsEnabled || state.policies.length < 4) {
      throw new Error("merchant_applications migration incomplete after apply");
    }

    if (
      !state.merchantProfileColumns.includes("category") ||
      !state.merchantProfileColumns.includes("is_verified")
    ) {
      throw new Error("merchant_profiles category/is_verified columns missing");
    }
  } finally {
    await client.end();
  }

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: insertError } = await anon.from("merchant_applications").insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    business_name: "blocked",
    category: "其他",
    address: "blocked",
    contact: "blocked",
  });

  if (
    insertError &&
    /permission denied|row-level security|violates|schema cache/i.test(
      insertError.message,
    )
  ) {
    console.log("OK anon cannot INSERT merchant_applications");
  } else {
    throw new Error(
      `anon should not insert merchant_applications (got: ${insertError?.message ?? "no error"})`,
    );
  }

  console.log("\nMerchant applications V1 migration applied successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
