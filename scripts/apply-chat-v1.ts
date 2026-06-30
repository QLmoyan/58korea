import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

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

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);

  if (!databaseUrl) {
    throw new Error("Missing database connection in .env.local");
  }

  const sqlPath = resolve(process.cwd(), "scripts/apply-chat-v1.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");

  await withFirstWorkingConnection(databaseUrl, async (connectionString) => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      await client.query(migrationSql);

      for (const tableName of [
        "chat_conversations",
        "chat_messages",
        "chat_user_blocks",
      ]) {
        const table = await client.query<{ table_name: string }>(
          `SELECT table_name
           FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = $1`,
          [tableName],
        );
        if (table.rows.length === 0) {
          throw new Error(`${tableName} table missing after migration`);
        }
      }

      const policies = await client.query<{ policyname: string; tablename: string }>(
        `SELECT policyname, tablename
         FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename IN ('chat_conversations', 'chat_messages', 'chat_user_blocks')`,
      );
      const policyNames = new Set(
        policies.rows.map((row) => `${row.tablename}:${row.policyname}`),
      );
      for (const name of [
        "chat_conversations:chat_conversations_select_participant",
        "chat_conversations:chat_conversations_insert_participant",
        "chat_messages:chat_messages_select_participant",
        "chat_messages:chat_messages_insert_sender",
        "chat_user_blocks:chat_user_blocks_select_own",
      ]) {
        if (!policyNames.has(name)) {
          throw new Error(`RLS policy missing: ${name}`);
        }
      }

      console.log("OK chat_conversations table exists");
      console.log("OK chat_messages table exists");
      console.log("OK chat_user_blocks table exists");
      console.log("OK chat RLS policies exist");
    } finally {
      await client.end();
    }
  });

  console.log("\nChat V1 migration applied successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
