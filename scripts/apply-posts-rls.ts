import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { publishPostAction } from "../lib/actions/publish-content";
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

function formatRoles(roles: string | string[]) {
  if (Array.isArray(roles)) {
    return roles.join(",");
  }

  return roles.replace(/^\{|\}$/g, "");
}

async function inspectTableRls(connectionString: string, tableName: string) {
  return withClient(connectionString, async (client) => {
    const rls = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = $1`,
      [tableName],
    );

    const policies = await client.query<{
      policyname: string;
      cmd: string;
      roles: string | string[];
      qual: string | null;
    }>(
      `SELECT policyname, cmd, roles, qual::text
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1
       ORDER BY policyname`,
      [tableName],
    );

    const grants = await client.query<{ grantee: string; privilege_type: string }>(
      `SELECT grantee, privilege_type
       FROM information_schema.role_table_grants
       WHERE table_schema = 'public'
         AND table_name = $1
         AND grantee IN ('anon', 'authenticated', 'service_role')
       ORDER BY grantee, privilege_type`,
      [tableName],
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl) {
    throw new Error(
      "Missing database connection. Set SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD in .env.local",
    );
  }

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars in .env.local");
  }

  const sqlPath = resolve(process.cwd(), "scripts/apply-posts-rls.sql");
  const migrationSql = readFileSync(sqlPath, "utf8");
  const connectionString = await applyMigration(databaseUrl, migrationSql);

  const postsAfter = await withFirstWorkingConnection(
    connectionString,
    (cs) => inspectTableRls(cs, "posts"),
  );
  const imagesAfter = await withFirstWorkingConnection(
    connectionString,
    (cs) => inspectTableRls(cs, "post_images"),
  );

  console.log("=== posts RLS (after) ===");
  console.log(`RLS enabled: ${postsAfter.rlsEnabled}`);
  for (const policy of postsAfter.policies) {
    console.log(
      `- ${policy.policyname}: ${policy.cmd}, roles=${policy.roles}, using=${policy.qual ?? "true"}`,
    );
  }

  console.log("\n=== post_images RLS (after) ===");
  console.log(`RLS enabled: ${imagesAfter.rlsEnabled}`);
  for (const policy of imagesAfter.policies) {
    console.log(
      `- ${policy.policyname}: ${policy.cmd}, roles=${policy.roles}, using=${policy.qual ?? "true"}`,
    );
  }

  const postsSelectPolicy = postsAfter.policies.find(
    (p) => p.policyname === "posts_select_published",
  );
  const imagesSelectPolicy = imagesAfter.policies.find(
    (p) => p.policyname === "post_images_select_published",
  );

  assert(postsAfter.rlsEnabled, "posts RLS is disabled");
  assert(imagesAfter.rlsEnabled, "post_images RLS is disabled");
  assert(postsSelectPolicy, "posts_select_published missing");
  assert(imagesSelectPolicy, "post_images_select_published missing");

  const legacyPostsPolicies = postsAfter.policies.filter(
    (p) => p.policyname !== "posts_select_published",
  );
  const legacyImagePolicies = imagesAfter.policies.filter(
    (p) => p.policyname !== "post_images_select_published",
  );

  assert(
    legacyPostsPolicies.length === 0,
    `Unexpected posts policies: ${legacyPostsPolicies.map((p) => p.policyname).join(", ")}`,
  );
  assert(
    legacyImagePolicies.length === 0,
    `Unexpected post_images policies: ${legacyImagePolicies.map((p) => p.policyname).join(", ")}`,
  );

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: feed, error: feedError } = await anon
    .from("posts")
    .select("*, post_images(id, public_url, sort_order, width, height)")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(5);

  assert(!feedError, `fetchPosts-style SELECT failed: ${feedError?.message}`);
  assert(feed && feed.length > 0, "No published posts in feed");
  console.log(`OK anon feed SELECT (${feed.length} published posts)`);

  const postId = feed[0].id;
  const { data: detail, error: detailError } = await anon
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("moderation_status", "published")
    .maybeSingle();

  assert(!detailError, `fetchPostById-style SELECT failed: ${detailError?.message}`);
  assert(detail?.id === postId, "fetchPostById-style post id mismatch");

  const { error: imagesError } = await anon
    .from("post_images")
    .select("id")
    .eq("post_id", postId)
    .limit(5);

  assert(!imagesError, `post_images SELECT failed: ${imagesError?.message}`);
  console.log(`OK anon post_images SELECT (post_id=${postId})`);

  const { error: commentsError } = await anon
    .from("comments")
    .select("id")
    .eq("post_id", postId)
    .eq("moderation_status", "published")
    .limit(5);

  assert(!commentsError, `comments SELECT failed: ${commentsError?.message}`);
  console.log(`OK anon comments SELECT still works (post_id=${postId})`);

  const stamp = Date.now();
  const { data: hiddenPost, error: hiddenInsertError } = await admin
    .from("posts")
    .insert({
      title: `hidden rls test ${stamp}`,
      content: "hidden post should not be readable",
      author: "RLS测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: false,
      following: false,
      moderation_status: "hidden",
      risk_score: 0,
      risk_level: "low",
      published_at: null,
      moderation_note: null,
    })
    .select("id")
    .single();

  assert(!hiddenInsertError, `hidden post seed failed: ${hiddenInsertError?.message}`);
  assert(hiddenPost?.id, "hidden post id missing");

  const { data: hiddenRead, error: hiddenReadError } = await anon
    .from("posts")
    .select("id")
    .eq("id", hiddenPost.id)
    .maybeSingle();

  assert(!hiddenReadError, `hidden post probe failed: ${hiddenReadError?.message}`);
  assert(!hiddenRead, "anon should not read hidden post");

  await admin.from("posts").delete().eq("id", hiddenPost.id);
  console.log("OK anon cannot read hidden post");

  const publishStamp = Date.now();
  const published = await publishPostAction({
    title: `posts rls publish ${publishStamp}`,
    content: "publish then client read",
    category: "其他",
    author: "RLS测试",
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  const { data: afterPublish, error: afterPublishError } = await anon
    .from("posts")
    .select("id, title")
    .eq("id", published.post.id)
    .eq("moderation_status", "published")
    .maybeSingle();

  assert(
    !afterPublishError,
    `post read after publish failed: ${afterPublishError?.message}`,
  );
  assert(afterPublish?.id === published.post.id, "published post not readable after publish");

  await admin.from("content_reviews").delete().eq("post_id", published.post.id);
  await admin.from("posts").delete().eq("id", published.post.id);

  console.log("OK publishPostAction + client post read succeeded");
  console.log("\nPosts RLS migration applied successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
