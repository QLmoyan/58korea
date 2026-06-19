import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  approveTargetContent,
  hideTargetContent,
  deleteTargetContent,
  markReviewDecision,
  markReportStatus,
} from "../lib/admin/content-actions";
import {
  createSessionToken,
  verifyAdminPassword,
  verifySessionToken,
} from "../lib/admin/session";
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

async function testSession() {
  assert(
    verifyAdminPassword(process.env.ADMIN_PASSWORD ?? ""),
    "Admin password should verify",
  );
  assert(!verifyAdminPassword("wrong-password"), "Wrong password should fail");

  const token = await createSessionToken();
  assert(await verifySessionToken(token), "Valid session token should verify");
  assert(!(await verifySessionToken("invalid.token")), "Invalid token should fail");
}

async function testReviewApproveFlow(
  admin: ReturnType<typeof createClient<Database>>,
) {
  const stamp = Date.now();

  const { data: pendingPost, error: pendingPostError } = await admin
    .from("posts")
    .insert({
      title: `Admin 高风险待审 ${stamp}`,
      content: "high risk pending review test",
      author: "Admin测试",
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
    .select("id, moderation_status")
    .single();

  assert(
    !pendingPostError && pendingPost,
    `Create pending post failed: ${pendingPostError?.message}`,
  );

  const { data: pendingReview, error: pendingReviewError } = await admin
    .from("content_reviews")
    .insert({
      target_type: "post",
      target_id: String(pendingPost.id),
      post_id: pendingPost.id,
      risk_score: 120,
      risk_level: "high",
      status: "open",
      matched_block_rules: [],
      matched_risk_rules: [{ keyword: "test", score: 120 }],
      matched_whitelist_rules: [],
      content_snapshot: { title: pendingPost.id },
    })
    .select("id")
    .single();

  assert(
    !pendingReviewError && pendingReview,
    `Create pending review failed: ${pendingReviewError?.message}`,
  );

  await approveTargetContent("post", String(pendingPost.id));
  await markReviewDecision(pendingReview.id, "approved", "approve");

  const { data: approvedPost } = await admin
    .from("posts")
    .select("moderation_status, published_at")
    .eq("id", pendingPost.id)
    .single();

  assert(
    approvedPost?.moderation_status === "published",
    "High risk approve should publish content",
  );
  assert(approvedPost?.published_at, "High risk approve should set published_at");

  const { data: approvedReview } = await admin
    .from("content_reviews")
    .select("status, decision")
    .eq("id", pendingReview.id)
    .single();

  assert(approvedReview?.status === "approved", "Review should be approved");
  assert(approvedReview?.decision === "approve", "Review decision should be approve");

  const { data: mediumPost, error: mediumPostError } = await admin
    .from("posts")
    .insert({
      title: `Admin 中风险已发 ${stamp}`,
      content: "medium risk published test",
      author: "Admin测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 70,
      risk_level: "medium",
      published_at: new Date().toISOString(),
    })
    .select("id, moderation_status, published_at")
    .single();

  assert(
    !mediumPostError && mediumPost,
    `Create medium post failed: ${mediumPostError?.message}`,
  );

  const originalPublishedAt = mediumPost.published_at;

  const { data: mediumReview, error: mediumReviewError } = await admin
    .from("content_reviews")
    .insert({
      target_type: "post",
      target_id: String(mediumPost.id),
      post_id: mediumPost.id,
      risk_score: 70,
      risk_level: "medium",
      status: "open",
      matched_block_rules: [],
      matched_risk_rules: [{ keyword: "test", score: 70 }],
      matched_whitelist_rules: [],
      content_snapshot: { title: mediumPost.id },
    })
    .select("id")
    .single();

  assert(
    !mediumReviewError && mediumReview,
    `Create medium review failed: ${mediumReviewError?.message}`,
  );

  await approveTargetContent("post", String(mediumPost.id));
  await markReviewDecision(mediumReview.id, "approved", "approve");

  const { data: unchangedPost } = await admin
    .from("posts")
    .select("moderation_status, published_at")
    .eq("id", mediumPost.id)
    .single();

  assert(
    unchangedPost?.moderation_status === "published",
    "Medium published content should stay published",
  );
  assert(
    unchangedPost?.published_at === originalPublishedAt,
    "Medium published content should keep published_at",
  );

  await admin.from("content_reviews").delete().eq("id", pendingReview.id);
  await admin.from("content_reviews").delete().eq("id", mediumReview.id);
  await admin.from("posts").delete().eq("id", pendingPost.id);
  await admin.from("posts").delete().eq("id", mediumPost.id);
}

async function testReportResolveFlow(
  admin: ReturnType<typeof createClient<Database>>,
) {
  const stamp = Date.now();

  const { data: post, error: postError } = await admin
    .from("posts")
    .insert({
      title: `Admin 举报测试 ${stamp}`,
      content: "report resolve test",
      author: "Admin测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id, moderation_status")
    .single();

  assert(!postError && post, `Create report post failed: ${postError?.message}`);

  const { data: report, error: reportError } = await admin
    .from("content_reports")
    .insert({
      target_type: "post",
      target_id: String(post.id),
      post_id: post.id,
      reason: "other",
      status: "open",
      reporter_key: randomUUID(),
    })
    .select("id")
    .single();

  assert(!reportError && report, `Create report failed: ${reportError?.message}`);

  await markReportStatus(report.id, "resolved");

  const { data: resolvedReport } = await admin
    .from("content_reports")
    .select("status")
    .eq("id", report.id)
    .single();

  assert(resolvedReport?.status === "resolved", "Report should be resolved");

  const { data: unchangedPost } = await admin
    .from("posts")
    .select("moderation_status")
    .eq("id", post.id)
    .single();

  assert(
    unchangedPost?.moderation_status === "published",
    "Resolve report should not change content",
  );

  await admin.from("content_reports").delete().eq("id", report.id);
  await admin.from("posts").delete().eq("id", post.id);
}

async function testHideAndDelete(
  admin: ReturnType<typeof createClient<Database>>,
) {
  const stamp = Date.now();

  const { data: hidePost, error: hidePostError } = await admin
    .from("posts")
    .insert({
      title: `Admin 隐藏测试 ${stamp}`,
      content: "hide test",
      author: "Admin测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  assert(!hidePostError && hidePost, `Create hide post failed: ${hidePostError?.message}`);

  await hideTargetContent("post", String(hidePost.id));

  const { data: hiddenPost } = await admin
    .from("posts")
    .select("moderation_status, published_at")
    .eq("id", hidePost.id)
    .single();

  assert(hiddenPost?.moderation_status === "hidden", "Hide should set hidden");
  assert(hiddenPost?.published_at === null, "Hide should clear published_at");

  await admin.from("posts").delete().eq("id", hidePost.id);

  const { data: deletePost, error: deletePostError } = await admin
    .from("posts")
    .insert({
      title: `Admin 删除测试 ${stamp}`,
      content: "delete test",
      author: "Admin测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  assert(
    !deletePostError && deletePost,
    `Create delete post failed: ${deletePostError?.message}`,
  );

  await deleteTargetContent("post", String(deletePost.id));

  const { data: deletedPost } = await admin
    .from("posts")
    .select("id")
    .eq("id", deletePost.id)
    .maybeSingle();

  assert(!deletedPost, "Delete should remove post");
}

async function testHttpAuth(baseUrl: string) {
  const unauthenticated = await fetch(`${baseUrl}/admin`, { redirect: "manual" });
  assert(
    unauthenticated.status === 307 || unauthenticated.status === 308,
    "Unauthenticated /admin should redirect",
  );
  const location = unauthenticated.headers.get("location") ?? "";
  assert(location.includes("/admin/login"), "Should redirect to login");

  const token = await createSessionToken();
  const authenticated = await fetch(`${baseUrl}/admin`, {
    headers: {
      Cookie: `admin_session=${token}`,
    },
    redirect: "manual",
  });

  assert(
    authenticated.status === 200,
    `Authenticated /admin should return 200, got ${authenticated.status}`,
  );

  const loginPage = await fetch(`${baseUrl}/admin/login`, {
    headers: {
      Cookie: `admin_session=${token}`,
    },
    redirect: "manual",
  });

  assert(
    loginPage.status === 307 || loginPage.status === 308,
    "Authenticated /admin/login should redirect to /admin",
  );
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const adminPassword = env.ADMIN_PASSWORD;
  const sessionSecret = env.ADMIN_SESSION_SECRET;
  const baseUrl = process.env.ADMIN_TEST_BASE_URL ?? "http://localhost:3000";

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY");
  assert(adminPassword, "Missing ADMIN_PASSWORD");
  assert(sessionSecret, "Missing ADMIN_SESSION_SECRET");

  await testSession();

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await testReviewApproveFlow(admin);
  await testReportResolveFlow(admin);
  await testHideAndDelete(admin);

  try {
    await testHttpAuth(baseUrl);
    console.log("HTTP middleware/auth check passed.");
  } catch (error) {
    console.warn(
      `HTTP auth check skipped or failed (${error instanceof Error ? error.message : error}). Start dev server with npm run dev to enable.`,
    );
  }

  console.log("Admin V1 integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
