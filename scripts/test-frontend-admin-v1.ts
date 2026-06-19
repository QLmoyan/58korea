import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyManualPostRiskLabel,
  clearManualPostRiskLabel,
} from "../lib/admin/manual-post-risk-actions";
import { MANUAL_POST_RISK_MIN_SCORE, MANUAL_POST_RISK_NOTE } from "../lib/admin/manual-post-risk";
import type { Database } from "../lib/supabase/database.types";

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
  if (!condition) throw new Error(message);
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceRoleKey, "Missing Supabase env");

  const admin = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: publishedPost, error: postError } = await admin
    .from("posts")
    .select("id")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assert(!postError && publishedPost, `Need a published post: ${postError?.message}`);

  const postId = publishedPost.id;
  console.log(`TEST_POST_ID=${postId}`);

  await admin
    .from("posts")
    .update({
      moderation_status: "published",
      risk_level: "low",
      risk_score: 0,
      moderation_note: null,
    })
    .eq("id", postId);

  await applyManualPostRiskLabel(postId);

  const { data: labeledPost } = await admin
    .from("posts")
    .select("moderation_status, risk_level, risk_score, moderation_note")
    .eq("id", postId)
    .single();

  assert(labeledPost?.moderation_status === "published", "Add risk: moderation_status");
  assert(labeledPost?.risk_level === "medium", "Add risk: risk_level");
  assert((labeledPost?.risk_score ?? 0) >= MANUAL_POST_RISK_MIN_SCORE, "Add risk: risk_score");
  assert(labeledPost?.moderation_note === MANUAL_POST_RISK_NOTE, "Add risk: moderation_note");

  await clearManualPostRiskLabel(postId);

  const { data: clearedPost } = await admin
    .from("posts")
    .select("risk_level, risk_score, moderation_note")
    .eq("id", postId)
    .single();

  assert(clearedPost?.risk_level === "low", "Remove risk: risk_level");
  assert(clearedPost?.risk_score === 0, "Remove risk: risk_score");
  assert(clearedPost?.moderation_note === null, "Remove risk: moderation_note");

  console.log("PASS: scripts/test-frontend-admin-v1.ts");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
