import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { registerUserAction } from "../lib/actions/register-user";
import { combineSeoulDateTime, validateHHmm } from "../lib/merchant/coupon-utils";
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

function assert(condition: unknown, message: string) {
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
  assert(!error, `sign in failed: ${error?.message}`);
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

  assert(validateHHmm("09:30"));
  assert(!validateHHmm("9:30"));

  const startsAt = combineSeoulDateTime("2026-07-01", "10:00");
  const endsAt = combineSeoulDateTime("2026-07-01", "19:00");
  assert(new Date(endsAt).getTime() > new Date(startsAt).getTime());

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const password = "Test123456!";
  const merchantUsername = `pcedit_m_${String(stamp).slice(-6)}`;
  const strangerUsername = `pcedit_s_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: merchantUsername,
    password,
    nickname: `编辑商家${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: strangerUsername,
    password,
    nickname: `路人${String(stamp).slice(-4)}`,
  });

  await signIn(supabase, merchantUsername, password);
  const {
    data: { user: merchantUser },
  } = await supabase.auth.getUser();
  assert(merchantUser?.id, "failed to resolve merchant user");

  const { data: strangerLookup } = await service
    .from("profiles")
    .select("id")
    .eq("username", strangerUsername)
    .single();
  assert(strangerLookup?.id, "failed to resolve stranger user");

  const { data: merchantProfile, error: merchantProfileError } = await service
    .from("merchant_profiles")
    .insert({
      user_id: merchantUser.id,
      business_name: `编辑测试商家${String(stamp).slice(-4)}`,
      description: "帖子优惠券编辑测试",
      address: "首尔测试地址",
      phone: "010-0000-0000",
      business_hours: "10:00-20:00",
      is_active: true,
    })
    .select("id")
    .single();

  assert(!merchantProfileError && merchantProfile?.id, merchantProfileError?.message);

  const { data: coupon, error: couponError } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: "编辑测试券",
      discount_amount_krw: 3000,
      total_quantity: 10,
      per_user_limit: 1,
      starts_at: startsAt,
      ends_at: endsAt,
      usage_note: "初始说明",
      is_active: true,
    })
    .select("id, title, claimed_quantity")
    .single();

  assert(!couponError && coupon?.id, couponError?.message);

  const { data: post, error: postError } = await service
    .from("posts")
    .insert({
      title: "优惠券编辑测试帖",
      content: "测试内容",
      author: `编辑商家${String(stamp).slice(-4)}`,
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

  assert(!postError && post?.id, postError?.message);

  const { data: updatedRow, error: updateError } = await service
    .from("merchant_coupons")
    .update({
      title: coupon.title,
      discount_amount_krw: 5000,
      total_quantity: 20,
      starts_at: combineSeoulDateTime("2026-07-02", "11:00"),
      ends_at: combineSeoulDateTime("2026-07-02", "21:00"),
      usage_note: "更新后的说明",
      is_active: true,
    })
    .eq("id", coupon.id)
    .select("*")
    .single();

  assert(!updateError && updatedRow, updateError?.message ?? "update failed");
  assert(updatedRow.discount_amount_krw === 5000, "amount not updated");
  assert(updatedRow.total_quantity === 20, "quantity not updated");
  assert(updatedRow.usage_note === "更新后的说明", "usage note not updated");

  await signIn(supabase, merchantUsername, password);
  const { data: removeMode, error: removeError } = await supabase.rpc(
    "remove_post_linked_coupon",
    { p_post_id: post.id, p_coupon_id: coupon.id },
  );
  assert(!removeError, removeError?.message ?? "remove failed");
  assert(removeMode === "deleted", "should hard delete when unclaimed");

  const { data: postAfterRemove } = await service
    .from("posts")
    .select("linked_coupon_id")
    .eq("id", post.id)
    .single();

  assert(postAfterRemove?.linked_coupon_id === null, "post link should be cleared");

  const { data: couponAfterRemove } = await service
    .from("merchant_coupons")
    .select("id")
    .eq("id", coupon.id)
    .maybeSingle();

  assert(!couponAfterRemove, "coupon should be deleted");

  const { data: claimedCoupon, error: claimedCouponError } = await service
    .from("merchant_coupons")
    .insert({
      merchant_id: merchantProfile.id,
      title: "已领取测试券",
      discount_amount_krw: 2000,
      total_quantity: 5,
      claimed_quantity: 2,
      per_user_limit: 1,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: true,
    })
    .select("id")
    .single();

  assert(!claimedCouponError && claimedCoupon?.id, claimedCouponError?.message);

  const { data: postWithClaimed, error: postWithClaimedError } = await service
    .from("posts")
    .insert({
      title: "已领取券编辑测试帖",
      content: "测试内容",
      author: `编辑商家${String(stamp).slice(-4)}`,
      author_id: merchantUser.id,
      linked_coupon_id: claimedCoupon.id,
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

  assert(!postWithClaimedError && postWithClaimed?.id, postWithClaimedError?.message);

  await signIn(supabase, strangerUsername, password);
  await expectError(async () => {
    const { error } = await supabase.rpc("remove_post_linked_coupon", {
      p_post_id: postWithClaimed.id,
      p_coupon_id: claimedCoupon.id,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, /无权删除该帖子优惠券/);

  await signIn(supabase, merchantUsername, password);
  const { data: removedClaimedMode, error: removedClaimedError } =
    await supabase.rpc("remove_post_linked_coupon", {
      p_post_id: postWithClaimed.id,
      p_coupon_id: claimedCoupon.id,
    });
  assert(!removedClaimedError, removedClaimedError?.message ?? "remove claimed failed");
  assert(removedClaimedMode === "deactivated", "should deactivate when claimed");

  const { data: deactivatedCoupon } = await service
    .from("merchant_coupons")
    .select("is_active")
    .eq("id", claimedCoupon.id)
    .single();

  assert(deactivatedCoupon?.is_active === false, "coupon should be deactivated");

  const { data: postAfterDeactivate } = await service
    .from("posts")
    .select("linked_coupon_id")
    .eq("id", postWithClaimed.id)
    .single();

  assert(postAfterDeactivate?.linked_coupon_id === null, "claimed post link should clear");

  await service.from("posts").delete().in("id", [post.id, postWithClaimed.id]);
  await service.from("merchant_coupons").delete().eq("id", claimedCoupon.id);
  await service.from("merchant_profiles").delete().eq("id", merchantProfile.id);
  await service.auth.admin.deleteUser(merchantUser.id);
  await service.auth.admin.deleteUser(strangerLookup.id);

  console.log("Post linked coupon edit V1 checks passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
