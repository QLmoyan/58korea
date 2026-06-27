import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(url && anonKey, "Missing Supabase env vars");

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: merchantProfile, error: merchantError } = await supabase
    .from("merchant_profiles")
    .select("user_id, business_name, is_active")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  assert(!merchantError, merchantError?.message ?? "failed to load merchant profile");
  assert(merchantProfile?.user_id, "need at least one active merchant profile");

  const { data: merchantPosts, error: postsError } = await supabase
    .from("posts")
    .select("id, author, author_id, moderation_status")
    .eq("author_id", merchantProfile.user_id)
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(5);

  assert(!postsError, postsError?.message ?? "failed to load merchant posts");

  const { data: merchantUserProfile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", merchantProfile.user_id)
    .maybeSingle();

  assert(!profileError, profileError?.message ?? "failed to load merchant username");
  assert(merchantUserProfile?.username, "merchant profile missing username");

  console.log("Merchant profile V1 checks passed:");
  console.log(`- business_name: ${merchantProfile.business_name}`);
  console.log(`- username: ${merchantUserProfile.username}`);
  console.log(`- published posts by author_id: ${merchantPosts?.length ?? 0}`);

  const { error: insertError } = await supabase.from("merchant_profiles").insert({
    user_id: merchantProfile.user_id,
    business_name: "duplicate merchant",
  });

  assert(insertError, "anon should not insert merchant_profiles");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
