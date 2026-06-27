import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
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
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: merchantProfile, error: merchantError } = await service
    .from("merchant_profiles")
    .select("id, business_name")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  assert(!merchantError, merchantError?.message ?? "failed to load merchant profile");
  assert(merchantProfile?.id, "need at least one active merchant profile");

  const stamp = Date.now();
  const endsAt = new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: coupon, error: couponError } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `测试优惠券${String(stamp).slice(-4)}`,
      discount_amount_krw: 3000,
      total_quantity: 5,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: endsAt,
      usage_note: "测试专用，可删除",
      is_active: true,
    })
    .select("*")
    .single();

  assert(!couponError && coupon?.id, couponError?.message ?? "failed to create test coupon");

  const username = `coupon_${String(stamp).slice(-7)}`;
  const password = "Test123456!";

  await registerUserAction({
    username,
    password,
    nickname: `券测试${String(stamp).slice(-4)}`,
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  assert(!signInError, `sign in failed: ${signInError?.message}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  assert(user?.id, "missing auth user");

  const { data: userCouponId, error: claimError } = await supabase.rpc(
    "claim_merchant_coupon",
    { p_coupon_id: coupon.id },
  );
  assert(!claimError, claimError?.message ?? "claim failed");
  assert(userCouponId, "missing user coupon id");

  const { data: userCoupon, error: userCouponError } = await supabase
    .from("user_coupons")
    .select("id, coupon_id, user_id, status, redeem_code")
    .eq("id", userCouponId)
    .maybeSingle();

  assert(!userCouponError, userCouponError?.message ?? "failed to load user coupon");
  assert(userCoupon?.coupon_id === coupon.id, "user coupon mismatch");
  assert(userCoupon?.user_id === user.id, "user coupon owner mismatch");
  assert(userCoupon?.redeem_code?.length === 8, "redeem_code should be generated");

  const { data: updatedCoupon, error: updatedCouponError } = await service
    .from("merchant_coupons")
    .select("claimed_quantity")
    .eq("id", coupon.id)
    .maybeSingle();

  assert(!updatedCouponError, updatedCouponError?.message ?? "failed to reload coupon");
  assert(updatedCoupon?.claimed_quantity === 1, "claimed_quantity should increment to 1");

  const { error: duplicateClaimError } = await supabase.rpc("claim_merchant_coupon", {
    p_coupon_id: coupon.id,
  });
  assert(duplicateClaimError, "duplicate claim should fail");

  await service.from("user_coupons").delete().eq("id", userCouponId);
  await service.from("merchant_coupons").delete().eq("id", coupon.id);

  console.log("Merchant coupons V1 checks passed:");
  console.log(`- merchant: ${merchantProfile.business_name}`);
  console.log(`- coupon: ${coupon.title}`);
  console.log(`- claimed by: ${username}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
