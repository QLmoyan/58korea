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

async function signIn(
  client: ReturnType<typeof createClient<Database>>,
  username: string,
  password: string,
) {
  const { error } = await client.auth.signInWithPassword({
    email: toInternalEmail(username),
    password,
  });
  assert(!error, `sign in failed (${username}): ${error?.message}`);
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

  const stamp = Date.now();
  const password = "Test123456!";
  const merchantUsername = `mredeem_${String(stamp).slice(-6)}`;
  const customerUsername = `credeem_${String(stamp).slice(-6)}`;
  const strangerUsername = `sredeem_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: merchantUsername,
    password,
    nickname: `核销商家${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: customerUsername,
    password,
    nickname: `核销顾客${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: strangerUsername,
    password,
    nickname: `核销路人${String(stamp).slice(-4)}`,
  });

  await signIn(supabase, merchantUsername, password);
  const {
    data: { user: merchantUser },
  } = await supabase.auth.getUser();
  assert(merchantUser?.id, "missing merchant auth user");

  const { data: merchantProfile, error: merchantProfileError } = await service
    .from("merchant_profiles")
    .insert({
      user_id: merchantUser.id,
      business_name: `测试核销商家${String(stamp).slice(-4)}`,
      is_active: true,
    })
    .select("id")
    .single();

  assert(
    !merchantProfileError && merchantProfile?.id,
    merchantProfileError?.message ?? "failed to create test merchant profile",
  );

  const endsAt = new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: coupon, error: couponError } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `核销测试券${String(stamp).slice(-4)}`,
      discount_amount_krw: 5000,
      total_quantity: 3,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: endsAt,
      usage_note: "核销测试专用",
      is_active: true,
    })
    .select("*")
    .single();

  assert(!couponError && coupon?.id, couponError?.message ?? "failed to create coupon");

  await signIn(supabase, customerUsername, password);
  const {
    data: { user: customerUser },
  } = await supabase.auth.getUser();
  assert(customerUser?.id, "missing customer auth user");

  const { data: userCouponId, error: claimError } = await supabase.rpc(
    "claim_merchant_coupon",
    { p_coupon_id: coupon.id },
  );
  assert(!claimError, claimError?.message ?? "claim failed");
  assert(userCouponId, "missing user coupon id");

  const { data: userCoupon, error: userCouponError } = await supabase
    .from("user_coupons")
    .select("id, redeem_code, status, user_id")
    .eq("id", userCouponId)
    .maybeSingle();

  assert(!userCouponError, userCouponError?.message ?? "failed to load user coupon");
  assert(userCoupon?.redeem_code, "missing redeem_code after claim");
  assert(/^\d{8}$/.test(userCoupon.redeem_code), "redeem_code should be 8 digits");
  assert(userCoupon.user_id === customerUser.id, "user coupon owner mismatch");

  await signIn(supabase, strangerUsername, password);
  const { error: strangerRedeemError } = await supabase.rpc("redeem_user_coupon", {
    p_redeem_code: userCoupon.redeem_code,
  });
  assert(strangerRedeemError, "non-merchant should not redeem");
  assert(
    /无权核销/i.test(strangerRedeemError.message),
    `unexpected stranger redeem error: ${strangerRedeemError.message}`,
  );

  await signIn(supabase, merchantUsername, password);
  const spacedCode = `${userCoupon.redeem_code.slice(0, 4)} ${userCoupon.redeem_code.slice(4)}`;
  const { data: redeemedId, error: redeemError } = await supabase.rpc(
    "redeem_user_coupon",
    { p_redeem_code: spacedCode },
  );
  assert(!redeemError, redeemError?.message ?? "merchant redeem failed");
  assert(redeemedId === userCouponId, "redeemed id mismatch");

  const { data: redeemedRow, error: redeemedRowError } = await service
    .from("user_coupons")
    .select("status, used_at, redeemed_at, redeemed_by")
    .eq("id", userCouponId)
    .maybeSingle();

  assert(!redeemedRowError, redeemedRowError?.message ?? "failed to reload redeemed row");
  assert(redeemedRow?.status === "used", "status should be used");
  assert(redeemedRow.used_at, "used_at should be set");
  assert(redeemedRow.redeemed_at, "redeemed_at should be set");
  assert(redeemedRow.redeemed_by === merchantUser.id, "redeemed_by mismatch");

  const { error: duplicateRedeemError } = await supabase.rpc("redeem_user_coupon", {
    p_redeem_code: userCoupon.redeem_code,
  });
  assert(duplicateRedeemError, "duplicate redeem should fail");
  assert(
    /已核销/i.test(duplicateRedeemError.message),
    `unexpected duplicate redeem error: ${duplicateRedeemError.message}`,
  );

  const { data: expiredCoupon, error: expiredCouponError } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `过期核销券${String(stamp).slice(-4)}`,
      discount_amount_krw: 2000,
      total_quantity: 1,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: new Date(stamp + 60 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select("*")
    .single();

  assert(
    !expiredCouponError && expiredCoupon?.id,
    expiredCouponError?.message ?? "failed to create expired coupon",
  );

  await signIn(supabase, customerUsername, password);
  const { data: expiredUserCouponId, error: expiredClaimError } = await supabase.rpc(
    "claim_merchant_coupon",
    { p_coupon_id: expiredCoupon.id },
  );
  assert(!expiredClaimError, expiredClaimError?.message ?? "expired coupon claim failed");
  assert(expiredUserCouponId, "missing expired user coupon id");

  const { data: expiredUserCoupon, error: expiredUserCouponError } = await supabase
    .from("user_coupons")
    .select("redeem_code")
    .eq("id", expiredUserCouponId)
    .maybeSingle();

  assert(
    !expiredUserCouponError && expiredUserCoupon?.redeem_code,
    expiredUserCouponError?.message ?? "missing expired redeem code",
  );

  await service
    .from("merchant_coupons")
    .update({ ends_at: new Date(stamp - 1000).toISOString() })
    .eq("id", expiredCoupon.id);

  await signIn(supabase, merchantUsername, password);
  const { error: expiredRedeemError } = await supabase.rpc("redeem_user_coupon", {
    p_redeem_code: expiredUserCoupon.redeem_code,
  });
  assert(expiredRedeemError, "expired coupon should not redeem");
  assert(
    /过期/i.test(expiredRedeemError.message),
    `unexpected expired redeem error: ${expiredRedeemError.message}`,
  );

  await service.from("user_coupons").delete().in("id", [userCouponId, expiredUserCouponId]);
  await service.from("merchant_coupons").delete().in("id", [coupon.id, expiredCoupon.id]);
  await service.from("merchant_profiles").delete().eq("id", merchantProfile.id);

  console.log("Coupon redemption V1 checks passed:");
  console.log(`- merchant: ${merchantUsername}`);
  console.log(`- customer: ${customerUsername}`);
  console.log(`- redeem_code: ${userCoupon.redeem_code}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
