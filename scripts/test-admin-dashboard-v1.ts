import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  daysAgoSeoulStartIso,
  startOfSeoulDayIso,
} from "../lib/admin/dashboard/time-bounds";
import { computeAdminDashboardStats } from "../lib/admin/dashboard-stats";
import { hasPermission } from "../lib/admin/permissions";
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceRoleKey, "Missing Supabase env vars");

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("=== Admin Dashboard V1 tests ===\n");

  assert(
    hasPermission("owner", "dashboard.read"),
    "owner should have dashboard.read",
  );
  assert(
    hasPermission("admin", "dashboard.read"),
    "admin should have dashboard.read",
  );
  assert(
    hasPermission("moderator", "dashboard.read"),
    "moderator should have dashboard.read",
  );

  const todayStart = startOfSeoulDayIso();
  const weekStart = daysAgoSeoulStartIso(7);
  const monthStart = daysAgoSeoulStartIso(30);
  assert(new Date(todayStart) <= new Date(), "today start should not be in future");
  assert(new Date(weekStart) <= new Date(todayStart), "week start should be <= today");
  assert(new Date(monthStart) <= new Date(weekStart), "month start should be <= week");

  const stamp = Date.now();
  const username = `dash_${stamp}`;
  const email = `${username}@users.58korea.com`;
  const password = `DashTest_${stamp}!`;

  const { data: createdUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

  assert(!createUserError && createdUser.user, createUserError?.message ?? "create user");

  const userId = createdUser.user.id;

  try {
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      username,
      nickname: `D${stamp}`,
    });
    assert(!profileError, profileError?.message ?? "insert profile");

    const { data: post, error: postError } = await admin
      .from("posts")
      .insert({
        title: `Dashboard post ${stamp}`,
        content: "dashboard stats test",
        author: `Dashboard ${stamp}`,
        author_id: userId,
        location: "首尔",
        distance: "350m",
        likes: 0,
        category: "其他",
        image_url: null,
        image_height: 180,
        nearby: true,
        following: false,
        moderation_status: "pending_review",
        risk_score: 120,
        risk_level: "high",
        published_at: null,
      })
      .select("id")
      .single();

    assert(!postError && post, postError?.message ?? "insert post");

    const { error: commentError } = await admin.from("comments").insert({
      id: randomUUID(),
      post_id: post.id,
      author: `Dashboard ${stamp}`,
      content: "dashboard comment",
      user_id: userId,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    });
    assert(!commentError, commentError?.message ?? "insert comment");

    const { error: viewError } = await admin.from("post_views").upsert({
      user_id: userId,
      post_id: post.id,
      viewed_at: new Date().toISOString(),
    });
    assert(!viewError, viewError?.message ?? "insert post view");

    const { error: reportError } = await admin.from("content_reports").insert({
      target_type: "post",
      target_id: String(post.id),
      post_id: post.id,
      reason: "other",
      detail: "dashboard test",
      reporter_key: `dash-${stamp}`,
      status: "open",
    });
    assert(!reportError, reportError?.message ?? "insert report");

    const stats = await computeAdminDashboardStats();

    assert(typeof stats.users.total === "number", "users.total");
    assert(stats.users.newToday >= 1, "should count new user today");
    assert(stats.users.dau >= 1, "DAU should include active test user");
    assert(stats.users.wau >= stats.users.dau, "WAU should be >= DAU");
    assert(stats.users.mau >= stats.users.wau, "MAU should be >= WAU");
    assert(stats.content.postsToday >= 1, "postsToday should include test post");
    assert(stats.content.commentsToday >= 1, "commentsToday should include test comment");
    assert(stats.content.searchesToday === null, "searchesToday should be null");
    assert(
      stats.operations.pendingReviewPosts >= 1,
      "pendingReviewPosts should include test post",
    );
    assert(stats.operations.pendingReports >= 1, "pendingReports should include test report");

    console.log("PASS  permissions dashboard.read");
    console.log("PASS  seoul time bounds");
    console.log("PASS  computeAdminDashboardStats shape and seeded counts");
    console.log("\nSample stats:", {
      users: stats.users,
      content: stats.content,
      operations: stats.operations,
    });
    console.log("\nAll Admin Dashboard V1 tests passed.");
  } finally {
    await admin.from("content_reports").delete().eq("reporter_key", `dash-${stamp}`);
    await admin.from("post_views").delete().eq("user_id", userId);
    await admin.from("comments").delete().eq("user_id", userId);
    await admin.from("posts").delete().eq("author_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
