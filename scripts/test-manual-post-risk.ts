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

  const stamp = Date.now();

  const { data: lowPost, error: insertError } = await admin
    .from("posts")
    .insert({
      title: `人工风险标签测试 ${stamp}`,
      content: "manual risk label test",
      author: "测试",
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
      moderation_note: null,
    })
    .select("id")
    .single();

  assert(!insertError && lowPost, `Create post failed: ${insertError?.message}`);

  await applyManualPostRiskLabel(lowPost.id);

  const { data: labeledPost } = await admin
    .from("posts")
    .select("moderation_status, risk_level, risk_score, moderation_note, published_at")
    .eq("id", lowPost.id)
    .single();

  assert(labeledPost?.moderation_status === "published", "Add label should keep post published");
  assert(labeledPost?.risk_level === "medium", "Add label should set medium risk");
  assert(
    (labeledPost?.risk_score ?? 0) >= MANUAL_POST_RISK_MIN_SCORE,
    "Add label should set score >= 60",
  );
  assert(labeledPost?.moderation_note === MANUAL_POST_RISK_NOTE, "Add label should set note");
  assert(labeledPost?.published_at, "Add label should keep published_at");

  const { data: highSeedPost, error: highInsertError } = await admin
    .from("posts")
    .insert({
      title: `人工风险标签高分测试 ${stamp}`,
      content: "manual risk label high score test",
      author: "测试",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
      moderation_status: "published",
      risk_score: 85,
      risk_level: "medium",
      published_at: new Date().toISOString(),
      moderation_note: null,
    })
    .select("id, risk_score")
    .single();

  assert(!highInsertError && highSeedPost, `Create high score post failed: ${highInsertError?.message}`);

  await applyManualPostRiskLabel(highSeedPost.id);

  const { data: preservedScorePost } = await admin
    .from("posts")
    .select("risk_score, moderation_note")
    .eq("id", highSeedPost.id)
    .single();

  assert(preservedScorePost?.risk_score === 85, "Add label should preserve score when already >= 60");
  assert(
    preservedScorePost?.moderation_note === MANUAL_POST_RISK_NOTE,
    "Add label should overwrite note",
  );

  await clearManualPostRiskLabel(lowPost.id);

  const { data: clearedPost } = await admin
    .from("posts")
    .select("risk_level, risk_score, moderation_note, moderation_status")
    .eq("id", lowPost.id)
    .single();

  assert(clearedPost?.risk_level === "low", "Remove label should set low risk");
  assert(clearedPost?.risk_score === 0, "Remove label should reset score");
  assert(clearedPost?.moderation_note === null, "Remove label should clear note");
  assert(
    clearedPost?.moderation_status === "published",
    "Remove label should not change moderation_status",
  );

  await admin.from("posts").delete().in("id", [lowPost.id, highSeedPost.id]);

  console.log("Manual post risk label test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
