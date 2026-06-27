import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { toInternalEmail } from "../lib/auth/username";
import {
  buildAutoCouponTitleFromAmount,
  combineSeoulDateTime,
  validateHHmm,
} from "../lib/merchant/coupon-utils";
import { prepareLinkedCouponForPublish } from "../lib/merchant/linked-coupon";
import type { Database } from "../lib/supabase/database.types";
import { POST_SELECT_WITH_LINKED_COUPON_SINGLE } from "../lib/supabase/post-mapper";

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

async function expectError(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
    throw new Error(`expected error matching ${pattern}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("expected error matching")) {
      throw error;
    }
    assert(pattern.test(message), `unexpected error: ${message}`);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  assert(url && anonKey && serviceRoleKey, "Missing Supabase env vars");

  assert(validateHHmm("09:30"), "09:30 should be valid");
  assert(!validateHHmm("9:30"), "9:30 should be invalid");
  assert(!validateHHmm("25:00"), "25:00 should be invalid");
  assert(buildAutoCouponTitleFromAmount(1000) === "1000韩元优惠券");
  assert(buildAutoCouponTitleFromAmount(3000) === "3000韩元优惠券");
  assert(buildAutoCouponTitleFromAmount(5000) === "5000韩元优惠券");

  const startsAt = combineSeoulDateTime("2026-06-30", "10:00");
  const endsAt = combineSeoulDateTime("2026-06-30", "19:00");
  assert(new Date(endsAt).getTime() > new Date(startsAt).getTime(), "ends must be after starts");

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();
  const password = "Test123456!";
  const merchantUsername = `plink_m_${String(stamp).slice(-6)}`;
  const customerUsername = `plink_c_${String(stamp).slice(-6)}`;

  await registerUserAction({
    username: merchantUsername,
    password,
    nickname: `发帖券商家${String(stamp).slice(-4)}`,
  });
  await registerUserAction({
    username: customerUsername,
    password,
    nickname: `发帖券用户${String(stamp).slice(-4)}`,
  });

  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await anon.auth.signInWithPassword({
    email: toInternalEmail(merchantUsername),
    password,
  });
  const {
    data: { user: merchantUser },
  } = await anon.auth.getUser();
  assert(merchantUser?.id, "missing merchant user");

  await anon.auth.signInWithPassword({
    email: toInternalEmail(customerUsername),
    password,
  });
  const {
    data: { user: customerUser },
  } = await anon.auth.getUser();
  assert(customerUser?.id, "missing customer user");

  const { data: merchantProfile } = await service
    .from("merchant_profiles")
    .insert({
      user_id: merchantUser.id,
      business_name: `发帖券测试商家${String(stamp).slice(-4)}`,
      is_active: true,
    })
    .select("id")
    .single();

  assert(merchantProfile?.id, "failed to create merchant profile");

  await expectError(
    () =>
      prepareLinkedCouponForPublish(customerUser.id, {
        mode: "add",
        coupon: {
          discountAmountKrw: 3000,
          totalQuantity: 5,
          startsDate: "2026-06-30",
          startsTime: "10:00",
          endsDate: "2026-07-30",
          endsTime: "19:00",
          usageNote: "",
        },
      }),
    /普通用户不能添加优惠券/,
  );

  const linkedCouponId = await prepareLinkedCouponForPublish(merchantUser.id, {
    mode: "add",
    coupon: {
      discountAmountKrw: 4000,
      totalQuantity: 8,
      startsDate: "2026-06-30",
      startsTime: "10:00",
      endsDate: "2026-07-30",
      endsTime: "19:00",
      usageNote: "发帖自动创建测试",
    },
  });
  assert(linkedCouponId, "should create and return new coupon id");

  const { data: createdCoupon, error: createdCouponError } = await service
    .from("merchant_coupons")
    .select("id, title, discount_amount_krw")
    .eq("id", linkedCouponId)
    .maybeSingle();

  assert(!createdCouponError && createdCoupon?.id, createdCouponError?.message ?? "coupon missing");
  assert(
    createdCoupon.title === "4000韩元优惠券",
    `auto title mismatch: ${createdCoupon.title}`,
  );
  assert(createdCoupon.discount_amount_krw === 4000, "discount amount mismatch");

  await expectError(
    () =>
      prepareLinkedCouponForPublish(merchantUser.id, {
        mode: "add",
        coupon: {
          discountAmountKrw: 1000,
          totalQuantity: 1,
          startsDate: "2026-07-30",
          startsTime: "19:00",
          endsDate: "2026-06-30",
          endsTime: "10:00",
          usageNote: "",
        },
      }),
    /结束时间必须晚于开始时间/,
  );

  const { data: post, error: postError } = await service
    .from("posts")
    .insert({
      title: `自动券帖子${String(stamp).slice(-4)}`,
      content: "publish auto coupon post test",
      author: "发帖券测试",
      author_id: merchantUser.id,
      linked_coupon_id: linkedCouponId,
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
    .select("id, linked_coupon_id")
    .single();

  assert(!postError && post?.id, postError?.message ?? "failed to create post");
  assert(post.linked_coupon_id === linkedCouponId, "post linked_coupon_id mismatch");

  const { data: fetchedPost, error: fetchError } = await anon
    .from("posts")
    .select(POST_SELECT_WITH_LINKED_COUPON_SINGLE)
    .eq("id", post.id)
    .maybeSingle();

  assert(!fetchError && fetchedPost?.linked_coupon_id === linkedCouponId, "detail fetch failed");
  const linked = Array.isArray(fetchedPost?.linked_coupon)
    ? fetchedPost.linked_coupon[0]
    : fetchedPost?.linked_coupon;
  assert(linked?.discount_amount_krw === 4000, "linked coupon join failed");
  assert(linked?.title === "4000韩元优惠券", "linked coupon title mismatch");

  await service.from("posts").delete().eq("id", post.id);
  await service.from("merchant_coupons").delete().eq("id", linkedCouponId);
  await service.from("merchant_profiles").delete().eq("id", merchantProfile.id);

  console.log("Publish auto coupon V1 checks passed:");
  console.log(`- merchant: ${merchantUsername}`);
  console.log(`- linked coupon: ${linkedCouponId}`);
  console.log(`- post id: ${post.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
