import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import type { Database } from "../../lib/supabase/database.types";

export type EnvMap = Record<string, string>;

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

export function loadEnvFromFile(): EnvMap {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    throw new Error(
      "Missing .env.local — copy .env.local.example and fill in your Supabase values.",
    );
  }

  const content = readFileSync(envPath, "utf8");
  const env: EnvMap = {};

  for (const line of content.split("\n")) {
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

export function resolveDatabaseUrl(env: EnvMap): string | null {
  if (env.SUPABASE_DB_URL) return env.SUPABASE_DB_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const password = env.SUPABASE_DB_PASSWORD;
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!password || !supabaseUrl) return null;

  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function buildConnectionCandidates(initialUrl: string): string[] {
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

function isConnectionError(message: string): boolean {
  return /ENOTFOUND|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|Tenant or user not found/i.test(
    message,
  );
}

async function withFirstWorkingConnection<T>(
  initialUrl: string,
  fn: (connectionString: string) => Promise<T>,
): Promise<T> {
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

export function hasDatabaseCredentials(env: EnvMap): boolean {
  return Boolean(resolveDatabaseUrl(env));
}

export type EnvCheckResult = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export function checkRequiredEnvVars(env: EnvMap): EnvCheckResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_BOOTSTRAP_PASSWORD",
  ];

  for (const key of required) {
    if (!env[key]?.trim()) missing.push(key);
  }

  if (!hasDatabaseCredentials(env)) {
    missing.push(
      "SUPABASE_DB_URL | DATABASE_URL | (SUPABASE_DB_PASSWORD + NEXT_PUBLIC_SUPABASE_URL)",
    );
  }

  if (!env.ADMIN_SESSION_SECRET?.trim()) {
    warnings.push(
      "ADMIN_SESSION_SECRET — required for /admin session in production",
    );
  }

  if (!env.ADMIN_PASSWORD?.trim()) {
    warnings.push(
      "ADMIN_PASSWORD — legacy admin login fallback; set if you use /admin password flow",
    );
  }

  return { ok: missing.length === 0, missing, warnings };
}

function isInvalidApiKeyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid api key") ||
    lower.includes("invalid jwt") ||
    lower.includes("apikey invalid")
  );
}

export async function testSupabaseApi(env: EnvMap): Promise<void> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Cannot test Supabase API: missing URL, anon key, or service role key");
  }

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: anonError } = await anon.from("posts").select("id").limit(1);
  if (anonError && isInvalidApiKeyError(anonError.message)) {
    throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonError.message}`);
  }
  if (anonError && !/permission denied|row-level security|JWT expired/i.test(anonError.message)) {
    throw new Error(`Supabase anon client error: ${anonError.message}`);
  }

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: serviceError } = await service.from("posts").select("id").limit(1);
  if (serviceError && isInvalidApiKeyError(serviceError.message)) {
    throw new Error(`Invalid SUPABASE_SERVICE_ROLE_KEY: ${serviceError.message}`);
  }
  if (serviceError) {
    throw new Error(`Supabase service client error: ${serviceError.message}`);
  }
}

export async function resolveWorkingDatabaseUrl(env: EnvMap): Promise<string> {
  const databaseUrl = resolveDatabaseUrl(env);
  if (!databaseUrl) {
    throw new Error("Cannot resolve database URL from environment");
  }

  return await withFirstWorkingConnection(databaseUrl, async (connectionString) => {
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 15000,
    });

    try {
      await client.connect();
      const result = await client.query("SELECT 1 AS ok");
      if (result.rows[0]?.ok !== 1) {
        throw new Error("Database ping returned unexpected result");
      }
      return connectionString;
    } finally {
      await client.end().catch(() => undefined);
    }
  });
}

export async function testDatabaseConnection(env: EnvMap): Promise<void> {
  await resolveWorkingDatabaseUrl(env);
}
