import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

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

async function withClient<T>(
  connectionString: string,
  fn: (client: pg.Client) => Promise<T>,
) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
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

async function applyMigration(initialUrl: string, migrationSql: string) {
  return withFirstWorkingConnection(initialUrl, async (connectionString) => {
    await withClient(connectionString, async (client) => {
      await client.query(migrationSql);
    });
    return connectionString;
  });
}

async function inspectProfilesRls(connectionString: string) {
  return withClient(connectionString, async (client) => {
    const rls = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'profiles'`,
    );

    const policies = await client.query<{
      policyname: string;
      cmd: string;
      roles: string | string[];
      qual: string | null;
      with_check: string | null;
    }>(
      `SELECT policyname, cmd, roles, qual::text, with_check::text
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'profiles'
       ORDER BY policyname`,
    );

    function formatRoles(roles: string | string[]) {
      if (Array.isArray(roles)) {
        return roles.join(",");
      }

      return roles.replace(/^\{|\}$/g, "");
    }

    const grants = await client.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type
       FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name = 'profiles'
         AND grantee IN ('anon', 'authenticated', 'service_role')
       ORDER BY grantee, privilege_type`,
    );

    return {
      rlsEnabled: rls.rows[0]?.relrowsecurity ?? false,
      policies: policies.rows.map((policy) => ({
        ...policy,
        roles: formatRoles(policy.roles),
      })),
      grants: grants.rows,
    };
  });
}

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);

  if (!databaseUrl) {
    throw new Error(
      "Missing database connection. Set SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD in .env.local",
    );
  }

  const before = await withFirstWorkingConnection(databaseUrl, inspectProfilesRls);

  console.log("=== profiles RLS (before) ===");
  console.log(`RLS enabled: ${before.rlsEnabled}`);
  console.log(
    `Policies: ${
      before.policies.length
        ? before.policies
            .map(
              (policy) =>
                `${policy.policyname} (${policy.cmd}, roles=${policy.roles})`,
            )
            .join("; ")
        : "(none)"
    }`,
  );
  console.log(
    `Grants: ${
      before.grants.length
        ? before.grants.map((g) => `${g.grantee}:${g.privilege_type}`).join(", ")
        : "(none)"
    }`,
  );

  const sqlPath = resolve(process.cwd(), "scripts/apply-profiles-rls.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");
  const connectionString = await applyMigration(databaseUrl, migrationSql);

  const after = await inspectProfilesRls(connectionString);

  console.log("\n=== profiles RLS (after) ===");
  console.log(`RLS enabled: ${after.rlsEnabled}`);
  for (const policy of after.policies) {
    console.log(
      `- ${policy.policyname}: ${policy.cmd}, roles=${policy.roles}, using=${policy.qual ?? "true"}, with_check=${policy.with_check ?? "null"}`,
    );
  }
  console.log(
    `Grants: ${after.grants.map((g) => `${g.grantee}:${g.privilege_type}`).join(", ")}`,
  );

  const selectPolicy = after.policies.find((p) => p.policyname === "profiles_select_own");
  const updatePolicy = after.policies.find((p) => p.policyname === "profiles_update_own");

  if (!after.rlsEnabled) {
    throw new Error("profiles RLS is still disabled after migration");
  }

  if (!selectPolicy || !updatePolicy) {
    throw new Error("profiles SELECT/UPDATE policies missing after migration");
  }

  if (!selectPolicy.qual?.includes("auth.uid()")) {
    throw new Error("profiles_select_own policy missing auth.uid() check");
  }

  const anonSelect = after.grants.some(
    (g) => g.grantee === "anon" && g.privilege_type === "SELECT",
  );
  if (anonSelect) {
    throw new Error("anon still has SELECT on profiles");
  }

  console.log("\nProfiles RLS migration applied successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
