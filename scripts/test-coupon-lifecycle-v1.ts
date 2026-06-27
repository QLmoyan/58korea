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

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
    throw new Error(`Expected error matching ${pattern}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Expected error matching/.test(message)) {
      throw error;
    }
    assert(pattern.test(message), message);
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

  const stamp = Date.now();
  const password = "Test123456!";
  const merchantUsername = `mlife_m_${String(stamp).slice(-6)}`;
  const customerUsername = `mlife_c_${String(stamp).slice(-6)}`;
  const strangerUsername = `mlife_s_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: merchantUsername,
    password,
    nickname: `生命周期商家${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: customerUsername,
    password,
    nickname: `生命周期顾客${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: strangerUsername,
    password,
    nickname: `生命周期路人${String(stamp).slice(-4)}`,
  });

  await signIn(supabase, merchantUsername, password);
  const {
    data: { user: merchantUser },
  } = await supabase.auth.getUser();
  assert(merchantUser?.id, "missing merchant auth user");

  const { data: merchantProfile } = await service
    .from("merchant_profiles")
    .insert({
      user_id: merchantUser.id,
      business_name: `生命周期商家${String(stamp).slice(-4)}`,
      is_active: true,
    })
    .select("id")
    .single();

  assert(merchantProfile?.id, "failed to create merchant profile");

  const endsAt = new Date(stamp + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: coupon } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `生命周期券${String(stamp).slice(-4)}`,
      discount_amount_krw: 4000,
      total_quantity: 5,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: endsAt,
      is_active: true,
    })
    .select("*")
    .single();

  assert(coupon?.id, "failed to create coupon");

  const { data: post } = await service
    .from("posts")
    .insert({
      title: "生命周期测试帖",
      content: "测试内容",
      author: `生命周期商家${String(stamp).slice(-4)}`,
      author_id: merchantUser.id,
      linked_coupon_id: coupon.id,
      location: "首尔",
      distance: "100m",
      likes: 0,
      category: "探店",
      nearby: false,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id, linked_coupon_id")
    .single();

  assert(post?.id, "failed to create post");

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

  const { data: claimedRow } = await service
    .from("user_coupons")
    .select("status, expires_at, redeem_code")
    .eq("id", userCouponId)
    .single();

  assert(claimedRow?.status === "claimed", "claimed status expected");
  assert(claimedRow?.expires_at, "expires_at should be set on claim");
  assert(claimedRow.redeem_code, "redeem code expected");
  assert(/^\d{8}$/.test(claimedRow.redeem_code), "redeem code should be 8 digits");

  const { data: couponAfterClaim } = await service
    .from("merchant_coupons")
    .select("claimed_quantity, total_quantity")
    .eq("id", coupon.id)
    .single();
  assert(couponAfterClaim?.claimed_quantity === 1, "claimed_quantity should increment");
  assert(
    couponAfterClaim?.total_quantity === coupon.total_quantity,
    "total_quantity should remain unchanged",
  );

  await signIn(supabase, strangerUsername, password);
  const {
    data: { user: strangerUser },
  } = await supabase.auth.getUser();
  assert(strangerUser?.id, "missing stranger auth user");

  await expectError(async () => {
    const { error } = await supabase.rpc("remove_post_linked_coupon", {
      p_post_id: post.id,
      p_coupon_id: coupon.id,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, /无权删除该帖子优惠券/);

  await signIn(supabase, merchantUsername, password);
  const { data: removeMode, error: removeError } = await supabase.rpc(
    "remove_post_linked_coupon",
    { p_post_id: post.id, p_coupon_id: coupon.id },
  );
  assert(!removeError, removeError?.message ?? "remove failed");
  assert(removeMode === "deactivated", "should deactivate when claimed");

  const { data: postAfterRemove } = await service
    .from("posts")
    .select("linked_coupon_id")
    .eq("id", post.id)
    .single();
  assert(postAfterRemove?.linked_coupon_id === null, "post should not show coupon");

  const { data: couponAfterRemove } = await service
    .from("merchant_coupons")
    .select("is_active, claimed_quantity")
    .eq("id", coupon.id)
    .single();
  assert(couponAfterRemove?.is_active === false, "coupon should be inactive");

  const { data: cancelledRow } = await service
    .from("user_coupons")
    .select("status")
    .eq("id", userCouponId)
    .single();
  assert(cancelledRow?.status === "cancelled", "unredeemed claim should be cancelled");

  const { data: removeNotifications } = await service
    .from("notifications")
    .select("title, body")
    .eq("user_id", customerUser.id)
    .eq("type", "system")
    .eq("title", "优惠券已失效")
    .eq("body", `商家已下架《${coupon.title}》`);

  assert(
    (removeNotifications ?? []).length >= 1,
    "customer should receive coupon removal notification",
  );

  await signIn(supabase, merchantUsername, password);
  await expectError(async () => {
    const { error } = await supabase.rpc("redeem_user_coupon", {
      p_redeem_code: claimedRow.redeem_code,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, /因商家改动，该优惠券已失效/);

  const { data: deleteCoupon } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `删除帖测试券${String(stamp).slice(-4)}`,
      discount_amount_krw: 3000,
      total_quantity: 3,
      claimed_quantity: 1,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: endsAt,
      is_active: true,
    })
    .select("id")
    .single();

  assert(deleteCoupon?.id, "failed to create delete test coupon");

  const { data: deletePost } = await service
    .from("posts")
    .insert({
      title: "删除帖优惠券测试",
      content: "测试内容",
      author: `生命周期商家${String(stamp).slice(-4)}`,
      author_id: merchantUser.id,
      linked_coupon_id: deleteCoupon.id,
      location: "首尔",
      distance: "100m",
      likes: 0,
      category: "探店",
      nearby: false,
      following: false,
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  assert(deletePost?.id, "failed to create delete test post");

  await signIn(supabase, customerUsername, password);
  const { data: deleteClaimId, error: deleteClaimError } = await supabase.rpc(
    "claim_merchant_coupon",
    { p_coupon_id: deleteCoupon.id },
  );
  assert(!deleteClaimError, deleteClaimError?.message ?? "delete claim failed");

  await signIn(supabase, merchantUsername, password);
  const { error: deletePostError } = await supabase.rpc("delete_owned_post", {
    p_post_id: deletePost.id,
  });
  assert(!deletePostError, deletePostError?.message ?? "delete post failed");

  const { data: deleteClaimRow } = await service
    .from("user_coupons")
    .select("status")
    .eq("id", deleteClaimId)
    .single();
  assert(deleteClaimRow?.status === "cancelled", "delete post should cancel claim");

  const { data: redeemCoupon } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `可核销券${String(stamp).slice(-4)}`,
      discount_amount_krw: 1500,
      total_quantity: 2,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: new Date(stamp + 2 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select("id")
    .single();

  assert(redeemCoupon?.id, "failed to create redeem coupon");

  await signIn(supabase, customerUsername, password);
  const { data: redeemClaimId, error: redeemClaimError } = await supabase.rpc(
    "claim_merchant_coupon",
    { p_coupon_id: redeemCoupon.id },
  );
  assert(!redeemClaimError && redeemClaimId, redeemClaimError?.message ?? "redeem claim failed");

  const { data: redeemClaim } = await service
    .from("user_coupons")
    .select("redeem_code")
    .eq("id", redeemClaimId)
    .single();

  await signIn(supabase, merchantUsername, password);
  const { error: okRedeemError } = await supabase.rpc("redeem_user_coupon", {
    p_redeem_code: redeemClaim?.redeem_code ?? "",
  });
  assert(!okRedeemError, okRedeemError?.message ?? "valid redeem failed");

  const { data: expiredCoupon } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `过期券${String(stamp).slice(-4)}`,
      discount_amount_krw: 1000,
      total_quantity: 1,
      starts_at: new Date(stamp - 2 * 60 * 60 * 1000).toISOString(),
      ends_at: new Date(stamp - 30 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select("id")
    .single();

  assert(expiredCoupon?.id, "failed to create expired coupon");

  const { data: expiredClaimId } = await service
    .from("user_coupons")
    .insert({
      coupon_id: expiredCoupon.id,
      user_id: customerUser.id,
      status: "claimed",
      redeem_code: `EXP${String(stamp).slice(-4)}`,
      expires_at: new Date(stamp - 10 * 60 * 1000).toISOString(),
    })
    .select("id, redeem_code")
    .single();

  assert(expiredClaimId?.id, "failed to create expired claim");

  await signIn(supabase, merchantUsername, password);
  await expectError(async () => {
    const { error } = await supabase.rpc("redeem_user_coupon", {
      p_redeem_code: expiredClaimId.redeem_code,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, /优惠券已过期，无法核销/);

  const { data: reminderCoupon } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: `提醒券${String(stamp).slice(-4)}`,
      discount_amount_krw: 2500,
      total_quantity: 2,
      starts_at: new Date(stamp - 60_000).toISOString(),
      ends_at: new Date(stamp + 45 * 60 * 1000).toISOString(),
      is_active: true,
    })
    .select("id")
    .single();

  assert(reminderCoupon?.id, "failed to create reminder coupon");

  const reminderExpiresAt = new Date(stamp + 30 * 60 * 1000).toISOString();
  const { data: reminderClaim } = await service
    .from("user_coupons")
    .insert({
      coupon_id: reminderCoupon.id,
      user_id: customerUser.id,
      status: "claimed",
      redeem_code: `REM${String(stamp).slice(-4)}`,
      expires_at: reminderExpiresAt,
    })
    .select("id")
    .single();

  assert(reminderClaim?.id, "failed to create reminder claim");

  const { data: reminderCount1, error: reminderError1 } = await service.rpc(
    "process_expiring_coupon_reminders",
  );
  assert(!reminderError1, reminderError1?.message ?? "reminder failed");
  assert((reminderCount1 ?? 0) >= 1, "should create at least one reminder");

  const { data: reminderCount2 } = await service.rpc(
    "process_expiring_coupon_reminders",
  );
  assert((reminderCount2 ?? 0) === 0, "reminder should be idempotent");

  const { data: reminderNotification } = await service
    .from("notifications")
    .select("title, body")
    .eq("user_id", customerUser.id)
    .eq("type", "system")
    .eq("title", "您有一张优惠券即将到期")
    .maybeSingle();

  assert(reminderNotification?.body, "reminder notification missing");

  const { data: remindedClaim } = await service
    .from("user_coupons")
    .select("reminded_at")
    .eq("id", reminderClaim.id)
    .single();
  assert(remindedClaim?.reminded_at, "reminded_at should be set");

  await service.from("notifications").delete().eq("user_id", customerUser.id);
  await service.from("user_coupons").delete().eq("user_id", customerUser.id);
  await service.from("posts").delete().eq("author_id", merchantUser.id);
  await service.from("merchant_coupons").delete().eq("merchant_id", merchantProfile.id);
  await service.from("merchant_profiles").delete().eq("id", merchantProfile.id);
  await service.auth.admin.deleteUser(merchantUser.id);
  await service.auth.admin.deleteUser(customerUser.id);
  await service.auth.admin.deleteUser(strangerUser.id);

  console.log("Coupon lifecycle V1 checks passed (14 scenarios)");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
