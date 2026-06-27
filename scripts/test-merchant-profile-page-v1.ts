import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { isCouponPubliclyVisible } from "../lib/merchant/coupon-utils";
import {
  fetchMerchantProfileByUsername,
  fetchPublishedPostsByAuthorId,
} from "../lib/supabase/merchant-queries";
import { fetchCouponsByMerchantId } from "../lib/supabase/merchant-coupon-queries";
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

  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: merchantRow, error: merchantError } = await anon
    .from("merchant_profiles")
    .select("id, user_id, business_name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  assert(!merchantError, merchantError?.message ?? "failed to load merchant");
  assert(merchantRow?.user_id, "need at least one active merchant");

  const { data: profileRow, error: profileError } = await anon
    .from("profiles")
    .select("username")
    .eq("id", merchantRow.user_id)
    .maybeSingle();

  assert(!profileError, profileError?.message ?? "failed to load profile");
  assert(profileRow?.username, "merchant missing username");

  console.log("1) public merchant profile loads without phone");
  const merchantProfile = await fetchMerchantProfileByUsername(profileRow.username);
  assert(merchantProfile, "merchant profile should load by username");
  assert(merchantProfile.businessName.trim().length > 0, "business name required");
  assert(merchantProfile.phone === null, "public merchant profile should not expose phone");
  console.log("   PASS");

  console.log("2) merchant published posts load by author_id");
  const posts = await fetchPublishedPostsByAuthorId(merchantProfile.userId);
  assert(Array.isArray(posts), "posts should be an array");
  assert(
    posts.every((post) => post.authorId === merchantProfile.userId),
    "posts should belong to merchant user",
  );
  console.log("   PASS");

  console.log("3) public coupons filter to currently valid offers");
  const coupons = await fetchCouponsByMerchantId(merchantProfile.id, {
    publicOnly: true,
  });
  assert(
    coupons.every((coupon) => isCouponPubliclyVisible(coupon)),
    "public coupons should be currently valid",
  );
  console.log("   PASS");

  console.log("4) public profile header does not render phone");
  const headerSource = readFileSync(
    resolve(process.cwd(), "components/profile/ProfilePublicHeader.tsx"),
    "utf8",
  );
  assert(!headerSource.includes('label="电话"'), "public header should not show phone");
  assert(headerSource.includes("MerchantVerifiedBadge"), "merchant badge should remain");
  console.log("   PASS");

  console.log("\nAll merchant profile page V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
