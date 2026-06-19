import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { submitReportAction } from "../lib/actions/report-content";
import {
  REPORT_DUPLICATE_MESSAGE,
  REPORT_SUCCESS_MESSAGE,
} from "../lib/types/report";
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
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assert(serviceRoleKey, "Missing SUPABASE_SERVICE_ROLE_KEY");

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const reporterKey = randomUUID();
  const commentId = randomUUID();
  const createdReportIds: string[] = [];

  const { data: post, error: postError } = await admin
    .from("posts")
    .insert({
      title: `举报测试帖 ${stamp}`,
      content: "report v1 integration test",
      author: "举报测试",
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

  assert(!postError && post, `Create post failed: ${postError?.message}`);

  const { error: commentError } = await admin.from("comments").insert({
    id: commentId,
    post_id: post.id,
    author: "举报测试",
    content: `评论 ${stamp}`,
    parent_id: null,
    reply_to_author: null,
    moderation_status: "published",
    risk_score: 0,
    risk_level: "low",
    published_at: new Date().toISOString(),
  });

  assert(!commentError, `Create comment failed: ${commentError?.message}`);

  const postReport = await submitReportAction({
    targetType: "post",
    targetId: String(post.id),
    postId: post.id,
    reason: "porn",
    reporterKey,
  });
  assert(
    postReport.message === REPORT_SUCCESS_MESSAGE,
    "Post report should succeed",
  );

  const { data: postReportRow, error: postReportQueryError } = await admin
    .from("content_reports")
    .select("id, target_type, target_id, post_id, reason, status, linked_review_id")
    .eq("target_type", "post")
    .eq("target_id", String(post.id))
    .eq("reporter_key", reporterKey)
    .single();

  assert(!postReportQueryError && postReportRow, "Post report row missing");
  assert(postReportRow.reason === "porn", "Post report reason mismatch");
  assert(postReportRow.status === "open", "Post report status should be open");
  assert(postReportRow.linked_review_id === null, "Should not link review");
  createdReportIds.push(postReportRow.id);

  let duplicateFailed = false;
  try {
    await submitReportAction({
      targetType: "post",
      targetId: String(post.id),
      postId: post.id,
      reason: "fraud",
      reporterKey,
    });
  } catch (error) {
    duplicateFailed =
      error instanceof Error && error.message === REPORT_DUPLICATE_MESSAGE;
  }
  assert(duplicateFailed, "Duplicate post report should be rejected");

  const commentReport = await submitReportAction({
    targetType: "comment",
    targetId: commentId,
    postId: post.id,
    reason: "harassment",
    detail: undefined,
    reporterKey: randomUUID(),
  });
  assert(
    commentReport.message === REPORT_SUCCESS_MESSAGE,
    "Comment report should succeed",
  );

  const { data: commentReportRow } = await admin
    .from("content_reports")
    .select("id")
    .eq("target_type", "comment")
    .eq("target_id", commentId)
    .maybeSingle();

  assert(commentReportRow, "Comment report row missing");
  createdReportIds.push(commentReportRow.id);

  const { data: anonPost } = await anon
    .from("posts")
    .select("id, moderation_status")
    .eq("id", post.id)
    .maybeSingle();

  assert(anonPost?.moderation_status === "published", "Post should stay published");

  const { data: anonComment } = await anon
    .from("comments")
    .select("id, moderation_status")
    .eq("id", commentId)
    .maybeSingle();

  assert(
    anonComment?.moderation_status === "published",
    "Comment should stay published",
  );

  const { count: reviewCount, error: reviewCountError } = await admin
    .from("content_reviews")
    .select("id", { count: "exact", head: true })
    .eq("post_id", post.id);

  assert(!reviewCountError, `Review count failed: ${reviewCountError?.message}`);
  assert(reviewCount === 0, "Report should not create content_reviews");

  await admin.from("content_reports").delete().in("id", createdReportIds);
  await admin.from("comments").delete().eq("id", commentId);
  await admin.from("posts").delete().eq("id", post.id);

  console.log("Content Reports V1 integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
