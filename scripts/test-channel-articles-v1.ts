import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { toInternalEmail } from "../lib/auth/username";
import type { Database } from "../lib/supabase/database.types";

const ADMIN_USER_ID = "99c60ace-7447-4765-878a-4c9c5134d2a6";

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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(path: string, baseUrl: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  const html = await response.text();
  return { response, html };
}

async function signInAdmin(
  url: string,
  anonKey: string,
  password: string,
) {
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: toInternalEmail("admin"),
    password,
  });
  assert(!error, `admin sign in failed: ${error?.message}`);
  return client;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPassword = env.ADMIN_BOOTSTRAP_PASSWORD;
  const baseUrl = env.REGRESSION_BASE_URL ?? "http://localhost:3000";

  assert(url && anonKey && serviceRoleKey && adminPassword, "Missing env vars");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("1) channels table exists");
  const { data: channels, error: channelsError } = await service
    .from("channels")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  assert(!channelsError, channelsError?.message ?? "channels query failed");
  assert((channels?.length ?? 0) >= 6, "expected seed channels");
  console.log("   PASS");

  console.log("2) channel_articles table exists");
  const { error: articlesTableError } = await service
    .from("channel_articles")
    .select("id")
    .limit(1);
  assert(!articlesTableError, articlesTableError?.message ?? "channel_articles missing");
  console.log("   PASS");

  const channel = channels?.find((item) => item.slug === "official") ?? channels?.[0];
  assert(channel?.id, "missing test channel");

  const stamp = Date.now();
  let adminCreated: { id: string } | null = null;
  const { data: draftArticle, error: draftInsertError } = await service
    .from("channel_articles")
    .insert({
      channel_id: channel.id,
      author_id: ADMIN_USER_ID,
      title: `频道测试草稿 ${stamp}`,
      content_markdown: "## 草稿\n\n不应被匿名读取",
      status: "draft",
    })
    .select("id")
    .single();
  assert(!draftInsertError, draftInsertError?.message ?? "failed to seed draft");
  assert(draftArticle?.id, "missing draft article id");

  const { data: publishedArticle, error: publishedInsertError } = await service
    .from("channel_articles")
    .insert({
      channel_id: channel.id,
      author_id: ADMIN_USER_ID,
      title: `频道测试文章 ${stamp}`,
      content_markdown:
        "## 测试正文\n\n这是 **频道文章** 测试内容。\n\n[来源链接](https://example.com)",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id, title")
    .single();
  assert(!publishedInsertError, publishedInsertError?.message ?? "failed to seed published");
  assert(publishedArticle?.id, "missing published article id");

  console.log("3) anon can read published articles");
  const { data: anonPublished, error: anonPublishedError } = await anon
    .from("channel_articles")
    .select("id, title")
    .eq("id", publishedArticle.id)
    .maybeSingle();
  assert(!anonPublishedError, anonPublishedError?.message ?? "anon published read failed");
  assert(anonPublished?.id === publishedArticle.id, "anon should read published article");
  console.log("   PASS");

  console.log("4) anon cannot read draft articles");
  const { data: anonDraft, error: anonDraftError } = await anon
    .from("channel_articles")
    .select("id")
    .eq("id", draftArticle.id)
    .maybeSingle();
  assert(!anonDraftError, anonDraftError?.message ?? "anon draft query errored");
  assert(!anonDraft, "anon should not read draft article");
  console.log("   PASS");

  console.log("5) normal user cannot create articles");
  const normalEmail = `channel-test-${stamp}@58korea.local`;
  const normalPassword = `Test-${stamp}!`;
  const { data: createdUser, error: createUserError } =
    await service.auth.admin.createUser({
      email: normalEmail,
      password: normalPassword,
      email_confirm: true,
    });
  assert(!createUserError, createUserError?.message ?? "create normal user failed");
  assert(createdUser.user?.id, "missing normal user id");

  const normalClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: normalSignInError } = await normalClient.auth.signInWithPassword({
    email: normalEmail,
    password: normalPassword,
  });
  assert(!normalSignInError, normalSignInError?.message ?? "normal sign in failed");

  const { error: normalInsertError } = await normalClient.from("channel_articles").insert({
    channel_id: channel.id,
    author_id: createdUser.user.id,
    title: "blocked article",
    content_markdown: "should fail",
    status: "draft",
  });
  assert(normalInsertError, "normal user should not create channel articles");
  console.log("   PASS");

  console.log("6) admin/owner can create articles");
  const adminClient = await signInAdmin(url, anonKey, adminPassword);
  const { data: adminCreatedRow, error: adminInsertError } = await adminClient
    .from("channel_articles")
    .insert({
      channel_id: channel.id,
      author_id: ADMIN_USER_ID,
      title: `Admin 创建文章 ${stamp}`,
      content_markdown: "## Admin\n\n管理员创建测试",
      status: "draft",
    })
    .select("id")
    .single();
  assert(!adminInsertError, adminInsertError?.message ?? "admin insert failed");
  assert(adminCreatedRow?.id, "admin should create article");
  adminCreated = adminCreatedRow;
  console.log("   PASS");

  console.log("7) /square is channel entry, not post feed");
  const { response: squareResponse, html: squareHtml } = await fetchText("/square", baseUrl);
  assert(squareResponse.ok, `/square status=${squareResponse.status}`);
  assert(squareHtml.includes("韩国新闻"), "square should show channel modules");
  assert(squareHtml.includes("进入频道"), "square should link to channels");
  assert(!squareHtml.includes("暂无动态，去发布第一条吧"), "square should not show post feed empty state");
  console.log("   PASS");

  console.log("8) /channels/[slug] opens");
  const { response: channelResponse, html: channelHtml } = await fetchText(
    `/channels/${channel.slug}`,
    baseUrl,
  );
  assert(channelResponse.ok, `/channels/${channel.slug} status=${channelResponse.status}`);
  assert(channelHtml.includes(channel.name), "channel page should show channel name");
  console.log("   PASS");

  console.log("9) /articles/[id] opens");
  const { response: articleResponse, html: articleHtml } = await fetchText(
    `/articles/${publishedArticle.id}`,
    baseUrl,
  );
  assert(articleResponse.ok, `/articles/${publishedArticle.id} status=${articleResponse.status}`);
  assert(articleHtml.includes(publishedArticle.title), "article page should show title");
  assert(articleHtml.includes("测试正文"), "article page should render markdown body");
  console.log("   PASS");

  await service.from("channel_articles").delete().eq("id", draftArticle.id);
  await service.from("channel_articles").delete().eq("id", publishedArticle.id);
  if (adminCreated?.id) {
    await service.from("channel_articles").delete().eq("id", adminCreated.id);
  }
  if (createdUser.user?.id) {
    await service.auth.admin.deleteUser(createdUser.user.id);
  }

  console.log("\nAll channel articles V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
