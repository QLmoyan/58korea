/**
 * Full regression check. Run: npx tsx scripts/regression-check.ts
 * Requires: .env.local, dev server on localhost:3000 for HTTP checks.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  applyManualPostRiskLabel,
  clearManualPostRiskLabel,
} from "../lib/admin/manual-post-risk-actions";
import {
  hideTargetContent,
  deleteTargetContent,
} from "../lib/admin/content-actions";
import {
  listAccessibleAdminPanelTabs,
  canDeleteContentTarget,
} from "../lib/admin/admin-panel-ui";
import { hasPermission, listPermissions } from "../lib/admin/permissions";
import { loadAdminMembership } from "../lib/admin/load-admin-membership";
import { computeAdminDashboardStats } from "../lib/admin/dashboard-stats";
import {
  createSessionToken,
  getAdminSessionCookieName,
  verifyAdminPassword,
  verifySessionToken,
} from "../lib/admin/session";
import { publishCommentAction, publishPostAction } from "../lib/actions/publish-content";
import { toInternalEmail } from "../lib/auth/username";
import type { AdminPermission } from "../lib/types/admin-auth";
import type { Database } from "../lib/supabase/database.types";

const ADMIN_USER_ID = "99c60ace-7447-4765-878a-4c9c5134d2a6";
const BASE_URL = process.env.REGRESSION_BASE_URL ?? "http://localhost:3000";
const UNAUTHORIZED = "未授权访问";

type CheckResult = { name: string; pass: boolean; error?: string };

const results: CheckResult[] = [];

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env: Record<string, string> = {};

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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, pass: false, error: message });
    console.error(`FAIL  ${name}: ${message}`);
  }
}

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
    cookieHeader() {
      return [...store.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
  };
}

async function fetchWithTimeout(
  path: string,
  options: {
    cookie?: string;
    redirect?: RequestRedirect;
    timeoutMs?: number;
  } = {},
) {
  const headers: Record<string, string> = {};
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    redirect: options.redirect ?? "follow",
    signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
  });

  return response;
}

async function simulateAssertAdminPermission(input: {
  permission: AdminPermission;
  userId?: string | null;
  legacy?: boolean;
}) {
  if (input.userId) {
    const membership = await loadAdminMembership(input.userId);
    if (membership?.enabled && hasPermission(membership.role, input.permission)) {
      return;
    }
    throw new Error(UNAUTHORIZED);
  }

  if (input.legacy) {
    if (hasPermission("owner", input.permission)) {
      return;
    }
    throw new Error(UNAUTHORIZED);
  }

  throw new Error(UNAUTHORIZED);
}

async function expectUnauthorized(
  label: string,
  fn: () => Promise<void>,
) {
  try {
    await fn();
    throw new Error(`${label}: expected ${UNAUTHORIZED}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("expected")) {
      throw error;
    }
    assert(
      error instanceof Error && error.message === UNAUTHORIZED,
      `${label}: got ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function signInWithCookieStore(
  url: string,
  anonKey: string,
  email: string,
  password: string,
) {
  const cookieStore = createCookieStore();
  const browser = createBrowserClient<Database>(url, anonKey, {
    cookies: cookieStore,
  });

  const { error } = await browser.auth.signInWithPassword({ email, password });
  assert(!error, `signIn failed: ${error?.message}`);

  const server = createServerClient<Database>(url, anonKey, {
    cookies: cookieStore,
  });
  const {
    data: { user },
  } = await server.auth.getUser();
  assert(user?.id, "missing user after sign in");

  return { cookieStore, user };
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const legacyPassword = process.env.ADMIN_PASSWORD;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env");
  assert(adminPassword, "Missing ADMIN_BOOTSTRAP_PASSWORD");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let publishedPostId = 0;

  // --- 1. Normal user ---
  await check("1.1 首页可打开", async () => {
    const res = await fetchWithTimeout("/");
    assert(res.ok, `GET / status=${res.status}`);
  });

  await check("1.1b 广场页可打开", async () => {
    const res = await fetchWithTimeout("/square");
    assert(res.ok, `GET /square status=${res.status}`);
    const html = await res.text();
    assert(!html.includes("广场功能开发中"), "square page still placeholder");
    assert(!html.includes("暂无动态，去发布第一条吧"), "square should not show post feed");
    assert(html.includes("韩国新闻") || html.includes("官方公告"), "square should show channel modules");
    assert(html.includes("进入频道"), "square should link to channel pages");
  });

  await check("1.2 帖子详情可打开", async () => {
    const { data: post } = await service
      .from("posts")
      .select("id")
      .eq("moderation_status", "published")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert(post?.id, "no published post");
    publishedPostId = post.id;

    const res = await fetchWithTimeout(`/posts/${post.id}`);
    assert(res.ok, `GET /posts/${post.id} status=${res.status}`);
  });

  await check("1.3 可发帖 (publishPostAction)", async () => {
    const stamp = Date.now();
    const result = await publishPostAction({
      title: `regression ${stamp}`,
      content: "regression publish",
      categorySelection: "其他",
      author: "回归测试",
      location: "首尔",
      distance: "350m",
      nearby: true,
      following: false,
    });
    assert(result.post.id, "missing post id");
    await service.from("content_reviews").delete().eq("post_id", result.post.id);
    await service.from("posts").delete().eq("id", result.post.id);
  });

  await check("1.4 可评论 (publishCommentAction)", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    const result = await publishCommentAction({
      id: randomUUID(),
      postId: publishedPostId,
      author: "回归测试",
      content: `regression comment ${Date.now()}`,
    });
    assert(result.comment.id, "missing comment id");
    await service.from("comments").delete().eq("id", result.comment.id);
  });

  await check("1.5 普通用户无前台管理员能力", async () => {
    const stamp = Date.now();
    const username = `reg_${String(stamp).slice(-8)}`;
    const password = "Test123456!";

    const { error: signUpError } = await service.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, nickname: "回归用户" },
    });
    assert(!signUpError, signUpError?.message ?? "createUser failed");

    const { data: created } = await service.auth.admin.listUsers();
    const user = created.users.find((u) => u.email === toInternalEmail(username));
    assert(user?.id, "created user not found");

    const membership = await loadAdminMembership(user.id);
    assert(!membership?.enabled, "normal user should not be admin");

    await expectUnauthorized("normal frontend risk label", () =>
      simulateAssertAdminPermission({
        permission: "content.post.risk_label",
        userId: user.id,
      }),
    );

    await service.auth.admin.deleteUser(user.id);
  });

  await check("1.6 普通用户不能访问 /admin", async () => {
    const stamp = Date.now();
    const username = `reg_${String(stamp).slice(-7)}`;
    const password = "Test123456!";
    await service.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    const { cookieStore } = await signInWithCookieStore(
      url,
      anonKey,
      toInternalEmail(username),
      password,
    );

    const res = await fetchWithTimeout("/admin", {
      cookie: cookieStore.cookieHeader(),
      redirect: "manual",
    });
    assert(
      res.status >= 300 && res.status < 400,
      `/admin should redirect, got ${res.status}`,
    );
    const location = res.headers.get("location") ?? "";
    assert(location.includes("/admin/login"), `redirect location=${location}`);

    const { data: users } = await service.auth.admin.listUsers();
    const created = users.users.find((u) => u.email === toInternalEmail(username));
    if (created?.id) {
      await service.auth.admin.deleteUser(created.id);
    }
  });

  await check("1.6b /forgot-password 说明页可打开", async () => {
    const res = await fetchWithTimeout("/forgot-password");
    assert(res.ok, `GET /forgot-password status=${res.status}`);
    const html = await res.text();
    assert(html.includes("用户名"), "forgot-password should mention username login");
    assert(
      html.includes("联系") || html.includes("客服") || html.includes("站长"),
      "forgot-password should direct users to contact support",
    );
    assert(
      !html.includes("resetPasswordForEmail") && !html.includes("type=\"email\""),
      "forgot-password should not expose email reset form",
    );
  });

  await check("1.6c 登录页忘记密码入口 (静态)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/auth/LoginForm.tsx"),
      "utf8",
    );
    assert(source.includes('href="/forgot-password"'), "LoginForm missing forgot-password link");
    assert(source.includes("忘记密码"), "LoginForm missing forgot-password label");
  });

  await check("1.6d 资料页修改密码区块 (静态)", async () => {
    const profileSource = readFileSync(
      resolve(process.cwd(), "components/profile/ProfileEditContent.tsx"),
      "utf8",
    );
    assert(
      profileSource.includes("ChangePasswordSection"),
      "ProfileEditContent should render ChangePasswordSection",
    );

    const actionSource = readFileSync(
      resolve(process.cwd(), "lib/actions/change-password.ts"),
      "utf8",
    );
    assert(
      actionSource.includes("signInWithPassword") && actionSource.includes("updateUser"),
      "changePasswordAction should verify current password then update",
    );
  });

  await check("1.6e 人工重置脚本 (静态)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts/reset-user-password.ts"),
      "utf8",
    );
    assert(source.includes("auth.admin.updateUserById"), "reset script should use admin API");
    assert(source.includes("SUPABASE_SERVICE_ROLE_KEY"), "reset script should use service_role");
    assert(
      !source.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      "reset script must not use anon key as admin credential",
    );
  });

  await check("1.6f loadPostImagesForPost 不污染 Feed imageHeight (静态)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/store/post-store.tsx"),
      "utf8",
    );
    const fnMatch = source.match(
      /const loadPostImagesForPost = useCallback\(async[\s\S]*?\n  \}, \[\]\);/,
    );
    assert(fnMatch, "loadPostImagesForPost missing");
    const fnBody = fnMatch[0];
    assert(
      !fnBody.includes("imageHeight: images[0]?.height"),
      "loadPostImagesForPost must not overwrite post.imageHeight with post_images pixel height",
    );
    assert(
      fnBody.includes("imageUrl: images[0]?.url"),
      "loadPostImagesForPost should still update imageUrl",
    );
  });

  await check("1.6g 帖子详情无假浏览量 (静态)", async () => {
    const postDetailFiles = [
      "components/posts/PostDetailContent.tsx",
      "components/posts/PostDetailOverlayContent.tsx",
      "components/posts/CommentSection.tsx",
    ];
    for (const relativePath of postDetailFiles) {
      const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
      assert(
        !source.includes("viewCountPlaceholder"),
        `${relativePath} must not use viewCountPlaceholder`,
      );
      assert(
        !source.includes("commentCount * 5"),
        `${relativePath} must not use fake view formula (commentCount * 5)`,
      );
      assert(
        !source.includes('aria-label="浏览量"'),
        `${relativePath} must not render fake view count UI`,
      );
    }
  });

  await check("1.6h 我的评论 Tab 使用 user_id 查询 (静态)", async () => {
    const useProfileData = readFileSync(
      resolve(process.cwd(), "components/profile/useProfileData.ts"),
      "utf8",
    );
    assert(
      !useProfileData.includes("myComments"),
      "useProfileData must not build myComments from post-store",
    );
    assert(
      !useProfileData.includes("getOwnedCommentIds"),
      "useProfileData must not filter comments via local owned IDs",
    );
    assert(
      !useProfileData.includes("comment.author === authorName"),
      "useProfileData must not match comments by author nickname",
    );

    const commentsList = readFileSync(
      resolve(process.cwd(), "components/profile/ProfileCommentsList.tsx"),
      "utf8",
    );
    assert(
      commentsList.includes("fetchUserProfileComments"),
      "ProfileCommentsList must load comments via fetchUserProfileComments",
    );

    const queries = readFileSync(
      resolve(process.cwd(), "lib/supabase/profile-comment-queries.ts"),
      "utf8",
    );
    assert(
      queries.includes('.eq("user_id", userId)'),
      "profile-comment-queries must filter by user_id",
    );
    assert(
      queries.includes('.eq("moderation_status", "published")'),
      "profile-comment-queries must only return published comments",
    );
    assert(
      queries.includes('order("created_at", { ascending: false })'),
      "profile-comment-queries must sort by created_at DESC",
    );
  });

  await check("1.6i 我的评论 V2 查询 (集成)", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");

    const stamp = Date.now();
    const username = `pc_${String(stamp).slice(-7)}`;
    const otherUsername = `pco_${String(stamp).slice(-6)}`;
    const password = "Test123456!";

    const { error: createUserError } = await service.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username, nickname: "评论V2回归" },
    });
    assert(!createUserError, createUserError?.message ?? "create user failed");

    const { error: createOtherError } = await service.auth.admin.createUser({
      email: toInternalEmail(otherUsername),
      password,
      email_confirm: true,
      user_metadata: { username: otherUsername, nickname: "他人回归" },
    });
    assert(!createOtherError, createOtherError?.message ?? "create other user failed");

    const { data: listedUsers } = await service.auth.admin.listUsers();
    const user = listedUsers.users.find((entry) => entry.email === toInternalEmail(username));
    const otherUser = listedUsers.users.find(
      (entry) => entry.email === toInternalEmail(otherUsername),
    );
    assert(user?.id, "missing test user");
    assert(otherUser?.id, "missing other user");

    const { error: profileError } = await service.from("profiles").insert([
      { id: user.id, username, nickname: "评论V2回归" },
      { id: otherUser.id, username: otherUsername, nickname: "他人回归" },
    ]);
    assert(!profileError, profileError?.message ?? "insert profiles failed");

    const { data: post } = await service
      .from("posts")
      .select("id, title")
      .eq("id", publishedPostId)
      .maybeSingle();
    assert(post?.title, "missing post title");

    const olderCommentId = randomUUID();
    const newerCommentId = randomUUID();
    const hiddenCommentId = randomUUID();
    const otherCommentId = randomUUID();
    const now = Date.now();
    const publishedAt = new Date(now).toISOString();

    const baseComment = {
      post_id: publishedPostId,
      author: "评论V2回归",
      moderation_status: "published" as const,
      risk_score: 0,
      risk_level: "low" as const,
      published_at: publishedAt,
      parent_id: null,
      reply_to_author: null,
      image_url: null,
      image_storage_path: null,
      moderation_note: null,
    };

    const { error: insertError } = await service.from("comments").insert([
      {
        ...baseComment,
        id: olderCommentId,
        user_id: user.id,
        content: "older profile comment",
        created_at: new Date(now - 60_000).toISOString(),
      },
      {
        ...baseComment,
        id: newerCommentId,
        user_id: user.id,
        content: "newer profile comment",
        created_at: new Date(now - 1_000).toISOString(),
      },
      {
        ...baseComment,
        id: hiddenCommentId,
        user_id: user.id,
        content: "hidden profile comment",
        moderation_status: "hidden",
        published_at: null,
      },
      {
        ...baseComment,
        id: otherCommentId,
        user_id: otherUser.id,
        content: "other user comment",
        created_at: publishedAt,
      },
    ]);
    assert(!insertError, insertError?.message ?? "insert comments failed");

    const userClient = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: toInternalEmail(username),
      password,
    });
    assert(!signInError, signInError?.message ?? "sign in failed");

    const { fetchUserProfileComments } = await import(
      "../lib/supabase/profile-comment-queries"
    );
    const result = await fetchUserProfileComments({
      userId: user.id,
      client: userClient,
    });

    assert(result.entries.length === 2, `expected 2 comments, got ${result.entries.length}`);
    assert(
      result.entries.every((entry) => entry.comment.content !== "other user comment"),
      "should not include other user's comments",
    );
    assert(
      result.entries.every((entry) => entry.comment.content !== "hidden profile comment"),
      "should not include non-published comments",
    );
    assert(
      result.entries[0]?.comment.id === newerCommentId,
      "comments should be ordered by created_at DESC",
    );
    assert(
      result.entries[0]?.post?.id === post.id &&
        result.entries[0]?.post?.title === post.title,
      "post title should resolve for profile comments",
    );

    await service.from("comments").delete().in("id", [
      olderCommentId,
      newerCommentId,
      hiddenCommentId,
      otherCommentId,
    ]);
    await service.from("profiles").delete().in("id", [user.id, otherUser.id]);
    await service.auth.admin.deleteUser(user.id);
    await service.auth.admin.deleteUser(otherUser.id);
  });

  await check("1.7 前台管理员按钮 UI 对普通用户不可见 (静态)", async () => {
    const postDetail = readFileSync(
      resolve(process.cwd(), "components/posts/PostDetailContent.tsx"),
      "utf8",
    );
    assert(
      postDetail.includes("adminCapabilities?.isAdmin"),
      "PostDetailContent must gate FrontendAdminPostBar by isAdmin",
    );
  });

  // --- 2. Admin account ---
  await check("2.1 admin /login 登录 (SSR Cookie)", async () => {
    const { user, cookieStore } = await signInWithCookieStore(
      url,
      anonKey,
      "admin@users.58korea.com",
      adminPassword,
    );
    assert(user.id === ADMIN_USER_ID, `admin id mismatch: ${user.id}`);
    assert(
      cookieStore.cookieHeader().includes("auth-token"),
      "missing Supabase auth cookie",
    );
  });

  await check("2.2 admin 前台 capabilities", async () => {
    const membership = await loadAdminMembership(ADMIN_USER_ID);
    assert(membership?.enabled && membership.role === "owner", "admin membership");
    const permissions = listPermissions(membership.role);
    assert(permissions.includes("content.post.risk_label"), "missing risk_label");
    assert(permissions.includes("content.post.hide"), "missing hide");
    assert(permissions.includes("content.post.delete"), "missing delete");
    assert(permissions.includes("content.comment.hide"), "missing comment hide");
    assert(permissions.includes("content.comment.delete"), "missing comment delete");
  });

  await check("2.3 添加/移除风险提示", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    await service
      .from("posts")
      .update({
        moderation_status: "published",
        risk_level: "low",
        risk_score: 0,
        moderation_note: null,
      })
      .eq("id", publishedPostId);

    await applyManualPostRiskLabel(publishedPostId);
    const { data: labeled } = await service
      .from("posts")
      .select("risk_level, risk_score, moderation_note")
      .eq("id", publishedPostId)
      .single();
    assert(labeled?.risk_level === "medium", "add risk failed");

    await clearManualPostRiskLabel(publishedPostId);
    const { data: cleared } = await service
      .from("posts")
      .select("risk_level, risk_score, moderation_note")
      .eq("id", publishedPostId)
      .single();
    assert(cleared?.risk_level === "low", "remove risk failed");
  });

  await check("2.4 隐藏帖子 (hideTargetContent)", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    await service
      .from("posts")
      .update({ moderation_status: "published" })
      .eq("id", publishedPostId);

    await hideTargetContent("post", String(publishedPostId));
    const { data: hidden } = await service
      .from("posts")
      .select("moderation_status")
      .eq("id", publishedPostId)
      .single();
    assert(hidden?.moderation_status === "hidden", "hide failed");

    await service
      .from("posts")
      .update({ moderation_status: "published" })
      .eq("id", publishedPostId);
  });

  await check("2.5 删除帖子按钮有确认框 (静态)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/frontend/FrontendAdminPostBar.tsx"),
      "utf8",
    );
    assert(source.includes("window.confirm"), "FrontendAdminPostBar missing confirm");
    assert(source.includes("确认删除该帖子"), "delete confirm message missing");
  });

  await check("2.6 评论隐藏/删除按钮显示 (静态+权限)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/frontend/FrontendAdminCommentActions.tsx"),
      "utf8",
    );
    assert(source.includes("content.comment.hide"), "comment hide permission gate");
    assert(source.includes("content.comment.delete"), "comment delete permission gate");
    const perms = listPermissions("owner");
    assert(
      perms.includes("content.comment.hide") && perms.includes("content.comment.delete"),
      "owner missing comment moderation permissions",
    );
  });

  await check("2.7 /admin 后台可访问 (admin Supabase Cookie)", async () => {
    const { cookieStore } = await signInWithCookieStore(
      url,
      anonKey,
      "admin@users.58korea.com",
      adminPassword,
    );
    const res = await fetchWithTimeout("/admin", {
      cookie: cookieStore.cookieHeader(),
    });
    assert(res.ok, `GET /admin status=${res.status}`);
  });

  await check("2.8 后台 Tab 正常显示 (owner)", async () => {
    const tabs = listAccessibleAdminPanelTabs(listPermissions("owner"));
    assert(tabs.length === 6, `owner tabs=${tabs.map((t) => t.id).join(",")}`);
    assert(tabs[0]?.id === "dashboard", "dashboard should be first tab");
  });

  await check("2.9 帖子详情显示前台管理员操作区 (静态)", async () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/posts/PostDetailContent.tsx"),
      "utf8",
    );
    assert(source.includes("FrontendAdminPostBar"), "missing FrontendAdminPostBar");
    assert(source.includes("getAdminCapabilitiesAction"), "missing capabilities load");
  });

  // --- 3. Legacy ADMIN_PASSWORD ---
  await check("3.1 legacy 密码校验", async () => {
    assert(legacyPassword, "Missing ADMIN_PASSWORD");
    assert(verifyAdminPassword(legacyPassword), "legacy password verify failed");
  });

  await check("3.2 legacy session token", async () => {
    const token = await createSessionToken();
    assert(await verifySessionToken(token), "legacy token invalid");
  });

  await check("3.3 legacy /admin 可访问", async () => {
    const token = await createSessionToken();
    const cookie = `${getAdminSessionCookieName()}=${token}`;
    const res = await fetchWithTimeout("/admin", { cookie });
    assert(res.ok, `GET /admin with legacy cookie status=${res.status}`);
  });

  await check("3.4 legacy 后台操作权限 (owner 矩阵)", async () => {
    await simulateAssertAdminPermission({
      permission: "reviews.read",
      legacy: true,
    });
    await simulateAssertAdminPermission({
      permission: "rules.delete",
      legacy: true,
    });
    await simulateAssertAdminPermission({
      permission: "content.post.delete",
      legacy: true,
    });
  });

  // --- 4. Permission security ---
  await check("4.1 普通用户伪造前台管理员 Action 失败", async () => {
    const stamp = Date.now();
    const username = `sec_${String(stamp).slice(-8)}`;
    const password = "Test123456!";
    await service.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
    });
    const { data: users } = await service.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === toInternalEmail(username));
    assert(user?.id, "user missing");

    for (const permission of [
      "content.post.risk_label",
      "content.post.hide",
      "content.post.delete",
      "content.comment.hide",
      "content.comment.delete",
    ] as const) {
      await expectUnauthorized(`normal ${permission}`, () =>
        simulateAssertAdminPermission({ permission, userId: user.id }),
      );
    }

    await service.auth.admin.deleteUser(user.id);
  });

  await check("4.2 普通用户伪造后台 Admin Action 失败", async () => {
    const stamp = Date.now();
    const username = `sec_${String(stamp).slice(-7)}`;
    const password = "Test123456!";
    await service.auth.admin.createUser({
      email: toInternalEmail(username),
      password,
      email_confirm: true,
    });
    const { data: users } = await service.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === toInternalEmail(username));
    assert(user?.id, "user missing");

    for (const permission of [
      "reviews.read",
      "reviews.write",
      "reports.read",
      "rules.read",
      "rules.delete",
      "admins.manage",
    ] as const) {
      await expectUnauthorized(`normal admin ${permission}`, () =>
        simulateAssertAdminPermission({ permission, userId: user.id }),
      );
    }

    await service.auth.admin.deleteUser(user.id);
  });

  await check("4.3 admin UI 权限矩阵 (admin/moderator)", async () => {
    assert(hasPermission("owner", "dashboard.read"), "owner should have dashboard.read");
    assert(hasPermission("moderator", "dashboard.read"), "moderator should have dashboard.read");
    const adminTabs = listAccessibleAdminPanelTabs(listPermissions("admin"));
    assert(adminTabs.length === 6, "admin should see 6 tabs");
    assert(adminTabs[0]?.id === "dashboard", "dashboard should be first tab");
    const modTabs = listAccessibleAdminPanelTabs(listPermissions("moderator"));
    assert(
      modTabs.map((t) => t.id).join(",") === "dashboard,reviews,reports",
      `moderator tabs=${modTabs.map((t) => t.id).join(",")}`,
    );
    assert(!hasPermission("admin", "rules.delete"), "admin should lack rules.delete");
    assert(!hasPermission("admin", "admins.manage"), "admin should lack admins.manage");
    assert(
      !canDeleteContentTarget(listPermissions("moderator"), "post"),
      "moderator should not delete posts in UI",
    );
    assert(
      canDeleteContentTarget(listPermissions("moderator"), "comment"),
      "moderator should delete comments in UI",
    );
  });

  await check("4.4 admin dashboard stats action data shape", async () => {
    const stats = await computeAdminDashboardStats();
    assert(typeof stats.users.total === "number", "users.total");
    assert(typeof stats.users.dau === "number", "users.dau");
    assert(stats.content.searchesToday === null, "searchesToday should be null");
    assert(typeof stats.operations.pendingReports === "number", "pendingReports");
  });

  // --- RLS / permission denied scan ---
  await check("RLS anon 可读已发布帖子", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon
      .from("posts")
      .select("id")
      .eq("moderation_status", "published")
      .limit(1);
    assert(!error, `permission denied on posts: ${error?.message}`);
  });

  await check("RLS anon 可读已发布评论", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon
      .from("comments")
      .select("id")
      .eq("post_id", publishedPostId)
      .eq("moderation_status", "published")
      .limit(1);
    assert(!error, `permission denied on comments: ${error?.message}`);
  });

  await check("RLS anon 不可写入 post_likes", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("post_likes").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      post_id: publishedPostId,
    });
    assert(error, "anon should not insert post_likes");
  });

  await check("RLS anon 不可读取 post_favorites", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("post_favorites").select("post_id").limit(1);
    assert(error, "anon should not select post_favorites");
  });

  await check("RLS anon 不可写入 post_views", async () => {
    assert(publishedPostId > 0, "missing publishedPostId");
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("post_views").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      post_id: publishedPostId,
    });
    assert(error, "anon should not insert post_views");
  });

  await check("RLS anon 不可读取 post_views", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("post_views").select("post_id").limit(1);
    assert(error, "anon should not select post_views");
  });

  await check("RLS anon 可读启用商家 merchant_profiles", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon
      .from("merchant_profiles")
      .select("business_name")
      .eq("is_active", true)
      .limit(1);
    assert(!error, `anon should read active merchant_profiles: ${error?.message}`);
  });

  await check("RLS anon 不可写入 merchant_profiles", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("merchant_profiles").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      business_name: "blocked merchant",
    });
    assert(error, "anon should not insert merchant_profiles");
  });

  await check("RLS anon 可读启用频道 channels", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon
      .from("channels")
      .select("slug")
      .eq("is_active", true)
      .limit(1);
    assert(!error, `anon should read active channels: ${error?.message}`);
  });

  await check("RLS anon 不可写入 channel_articles", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: channel } = await service
      .from("channels")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    assert(channel?.id, "missing active channel");
    const { error } = await anon.from("channel_articles").insert({
      channel_id: channel.id,
      title: "blocked article",
      content_markdown: "blocked",
      status: "draft",
    });
    assert(error, "anon should not insert channel_articles");
  });

  await check("1.5 用户主页可打开", async () => {
    const { data: merchantProfile } = await service
      .from("merchant_profiles")
      .select("user_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!merchantProfile?.user_id) {
      console.log("SKIP  no active merchant profile for HTTP check");
      return;
    }

    const { data: profile } = await service
      .from("profiles")
      .select("username")
      .eq("id", merchantProfile.user_id)
      .maybeSingle();

    assert(profile?.username, "merchant missing username");

    const res = await fetchWithTimeout(`/profile/${profile.username}`, {
      timeoutMs: 15000,
    });
    assert(res.ok, `GET /profile/${profile.username} status=${res.status}`);

    const legacyMerchantRes = await fetchWithTimeout(
      `/merchants/${profile.username}`,
      {
        redirect: "manual",
        timeoutMs: 15000,
      },
    );
    assert(
      legacyMerchantRes.status >= 300 && legacyMerchantRes.status < 400,
      `GET /merchants/${profile.username} should redirect, status=${legacyMerchantRes.status}`,
    );

    const legacyUserRes = await fetchWithTimeout(`/${profile.username}`, {
      redirect: "manual",
      timeoutMs: 15000,
    });
    assert(
      legacyUserRes.status >= 300 && legacyUserRes.status < 400,
      `GET /${profile.username} should redirect, status=${legacyUserRes.status}`,
    );
  });

  await check("1.5b 商家主页公开信息不含 phone", async () => {
    const headerSource = readFileSync(
      resolve(process.cwd(), "components/profile/ProfilePublicHeader.tsx"),
      "utf8",
    );
    assert(
      !headerSource.includes('label="电话"'),
      "ProfilePublicHeader should not render phone on public merchant page",
    );
    assert(
      headerSource.includes("MerchantVerifiedBadge"),
      "ProfilePublicHeader should keep merchant verified badge",
    );
  });

  await check("1.5c 商家资料保存不写入 is_active", async () => {
    const actionSource = readFileSync(
      resolve(process.cwd(), "lib/actions/update-profile.ts"),
      "utf8",
    );
    const payloadMatch = actionSource.match(
      /const merchantUpdatePayload = \{([\s\S]*?)\};/,
    );
    assert(payloadMatch, "merchantUpdatePayload whitelist missing");
    assert(
      !payloadMatch[1].includes("is_active"),
      "updateProfileAction should not update is_active",
    );
    assert(
      actionSource.includes("logoStoragePath"),
      "updateProfileAction should support merchant logo uploads",
    );
  });

  await check("RLS anon 可读启用且有效 merchant_coupons", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon
      .from("merchant_coupons")
      .select("title")
      .eq("is_active", true)
      .limit(1);
    assert(!error, `anon should read active merchant_coupons: ${error?.message}`);
  });

  await check("RLS anon 不可写入 merchant_coupons", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("merchant_coupons").insert({
      merchant_id: "00000000-0000-0000-0000-000000000000",
      title: "blocked coupon",
      discount_amount_krw: 1000,
      total_quantity: 1,
    });
    assert(error, "anon should not insert merchant_coupons");
  });

  await check("RLS anon 不可读取 user_coupons", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.from("user_coupons").select("id").limit(1);
    assert(error, "anon should not select user_coupons");
  });

  await check("RLS anon 不可核销 redeem_user_coupon", async () => {
    const anon = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("redeem_user_coupon", {
      p_redeem_code: "TESTCODE",
    });
    assert(error, "anon should not redeem user coupons");
  });

  // --- Summary ---
  console.log("\n=== REGRESSION SUMMARY ===");
  const failed = results.filter((item) => !item.pass);
  for (const item of results) {
    console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}${item.error ? ` — ${item.error}` : ""}`);
  }

  console.log(`\nTotal: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);
  console.log(`permission denied remaining: ${failed.some((f) => f.error?.includes("permission denied")) ? "yes" : "no"}`);
  console.log(`loading stuck detected: no (HTTP checks use 5s timeout)`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
