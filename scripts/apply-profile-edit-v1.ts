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

  const sqlPath = resolve(process.cwd(), "scripts/apply-profile-edit-v1.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");

  await withFirstWorkingConnection(databaseUrl, async (connectionString) => {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
      await client.query(migrationSql);

      const columns = await client.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'profiles'
           AND column_name IN ('avatar_url', 'gender', 'city')`,
      );
      const columnNames = new Set(columns.rows.map((row) => row.column_name));
      for (const name of ["avatar_url", "gender", "city"]) {
        if (!columnNames.has(name)) {
          throw new Error(`profiles column missing after migration: ${name}`);
        }
      }

      console.log("OK profiles avatar_url, gender, city columns exist");
    } finally {
      await client.end();
    }
  });

  console.log("\nProfile edit V1 migration applied successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
