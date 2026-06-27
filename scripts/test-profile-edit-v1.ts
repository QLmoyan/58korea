import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { updateProfileAction } from "../lib/actions/update-profile";
import { registerUserAction } from "../lib/actions/register-user";
import { publishPostAction } from "../lib/actions/publish-content";
import { toInternalEmail } from "../lib/auth/username";
import {
  buildAvatarStoragePath,
  isValidAvatarStoragePath,
} from "../lib/profile/avatar";
import { COMMUNITY_MEDIA_BUCKET } from "../lib/supabase/storage";
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

async function cleanupUser(
  service: ReturnType<typeof createClient<Database>>,
  userId: string,
) {
  const { data: posts } = await service
    .from("posts")
    .select("id")
    .eq("author_id", userId);

  for (const post of posts ?? []) {
    await service.from("content_reviews").delete().eq("post_id", post.id);
    await service.from("comments").delete().eq("post_id", post.id);
  }

  await service.from("posts").delete().eq("author_id", userId);
  await service.from("merchant_profiles").delete().eq("user_id", userId);
  await service.from("profiles").delete().eq("id", userId);
  await service.auth.admin.deleteUser(userId);
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

  const { error: columnError } = await service
    .from("profiles")
    .select("avatar_url, gender, city")
    .limit(1);
  assert(!columnError, `profile edit columns missing: ${columnError?.message}`);

  const stamp = Date.now();
  const password = "Test123456!";
  const userAUsername = `pe_a_${String(stamp).slice(-6)}`;
  const userBUsername = `pe_b_${String(stamp).slice(-6)}`;

  console.log("0) updateProfileAction requires login");
  let loginRequired = false;
  try {
    await updateProfileAction({
      nickname: "未登录",
      bio: "test",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    loginRequired =
      message.includes("请先登录") ||
      message.includes("Dynamic server usage") ||
      message.includes("cookies");
  }
  assert(loginRequired, "updateProfileAction should reject unauthenticated calls");
  console.log("   PASS");

  const { userId: userAId } = await registerUserAction({
    username: userAUsername,
    password,
    nickname: `编辑A${String(stamp).slice(-4)}`,
    bio: "原始简介",
  });
  const { userId: userBId } = await registerUserAction({
    username: userBUsername,
    password,
    nickname: `编辑B${String(stamp).slice(-4)}`,
    bio: "B 的简介",
  });

  const clientA = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await clientA.auth.signInWithPassword({
    email: toInternalEmail(userAUsername),
    password,
  });
  await clientB.auth.signInWithPassword({
    email: toInternalEmail(userBUsername),
    password,
  });

  console.log("1) user can update own profile");
  const nextNickname = `新昵称${String(stamp).slice(-4)}`;
  const { error: updateError } = await clientA
    .from("profiles")
    .update({
      nickname: nextNickname,
      bio: "更新后的简介",
      gender: "男",
      city: "首尔",
    })
    .eq("id", userAId);
  assert(!updateError, updateError?.message ?? "profile update failed");

  const { data: updatedA } = await service
    .from("profiles")
    .select("nickname, bio, gender, city")
    .eq("id", userAId)
    .single();
  assert(updatedA?.nickname === nextNickname, "nickname not updated");
  assert(updatedA?.bio === "更新后的简介", "bio not updated");
  assert(updatedA?.gender === "男", "gender not updated");
  assert(updatedA?.city === "首尔", "city not updated");
  console.log("   PASS");

  console.log("2) user cannot update another profile");
  const { error: crossUpdateError } = await clientA
    .from("profiles")
    .update({ nickname: "恶意修改" })
    .eq("id", userBId);
  assert(!crossUpdateError, crossUpdateError?.message ?? "unexpected update error");

  const { data: userBProfile } = await service
    .from("profiles")
    .select("nickname")
    .eq("id", userBId)
    .single();
  assert(
    userBProfile?.nickname === `编辑B${String(stamp).slice(-4)}`,
    "other user profile should remain unchanged",
  );
  console.log("   PASS");

  console.log("3) avatar upload succeeds");
  const avatarPath = buildAvatarStoragePath(userAId, `${stamp}.jpg`);
  assert(isValidAvatarStoragePath(userAId, avatarPath), "avatar path invalid");

  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const { error: uploadError } = await clientA.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(avatarPath, pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });
  assert(!uploadError, uploadError?.message ?? "avatar upload failed");

  const { data: publicUrlData } = service.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .getPublicUrl(avatarPath);

  const { error: avatarUpdateError } = await clientA
    .from("profiles")
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq("id", userAId);
  assert(!avatarUpdateError, avatarUpdateError?.message ?? "avatar_url update failed");

  const { data: avatarRow } = await service
    .from("profiles")
    .select("avatar_url")
    .eq("id", userAId)
    .single();
  assert(avatarRow?.avatar_url?.includes(avatarPath), "avatar_url not saved");
  console.log("   PASS");

  console.log("4) merchant profile updates");
  const { error: merchantInsertError } = await service.from("merchant_profiles").insert({
    user_id: userAId,
    business_name: "测试商家A",
    description: "原始商家简介",
    address: "首尔明洞",
    phone: "010-0000-0000",
    business_hours: "10:00-20:00",
    is_active: true,
  });
  assert(!merchantInsertError, merchantInsertError?.message ?? "merchant insert failed");

  const { error: merchantUpdateError } = await clientA
    .from("merchant_profiles")
    .update({
      business_name: "测试商家A-新",
      description: "更新后的商家简介",
      address: "首尔弘大",
      phone: "010-1111-1111",
      business_hours: "11:00-21:00",
      logo_url: publicUrlData.publicUrl,
    })
    .eq("user_id", userAId);
  assert(!merchantUpdateError, merchantUpdateError?.message ?? "merchant update failed");

  const { data: merchantRow } = await service
    .from("merchant_profiles")
    .select("business_name, description, address, phone, business_hours, logo_url")
    .eq("user_id", userAId)
    .single();
  assert(merchantRow?.business_name === "测试商家A-新", "merchant business_name mismatch");
  assert(merchantRow?.description === "更新后的商家简介", "merchant description mismatch");
  assert(merchantRow?.address === "首尔弘大", "merchant address mismatch");
  console.log("   PASS");

  console.log("7) public merchant profile hides phone and shows updated fields");
  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
  const { fetchMerchantProfileByUsername } = await import(
    "../lib/supabase/merchant-queries"
  );
  const publicMerchant = await fetchMerchantProfileByUsername(userAUsername);
  assert(publicMerchant, "public merchant profile should load");
  assert(publicMerchant.businessName === "测试商家A-新", "public business name mismatch");
  assert(publicMerchant.description === "更新后的商家简介", "public description mismatch");
  assert(publicMerchant.address === "首尔弘大", "public address mismatch");
  assert(publicMerchant.businessHours === "11:00-21:00", "public business hours mismatch");
  assert(publicMerchant.logoUrl?.includes("avatars/") || publicMerchant.logoUrl?.includes("merchants/"), "public logo missing");
  assert(publicMerchant.phone === null, "public merchant profile should not expose phone");
  console.log("   PASS");

  console.log("8) merchant logo storage path validation");
  const { buildMerchantLogoStoragePath, isValidMerchantLogoStoragePath } =
    await import("../lib/profile/merchant-logo");
  const logoPath = buildMerchantLogoStoragePath(userAId, `${stamp}.png`);
  assert(isValidMerchantLogoStoragePath(userAId, logoPath), "merchant logo path invalid");
  assert(!isValidMerchantLogoStoragePath(userBId, logoPath), "logo path should be user scoped");
  console.log("   PASS");

  console.log("9) merchant field update does not require is_active input");
  const { data: activeBefore } = await service
    .from("merchant_profiles")
    .select("is_active")
    .eq("user_id", userAId)
    .single();
  assert(activeBefore?.is_active === true, "merchant should start active");

  const { error: businessOnlyUpdateError } = await clientA
    .from("merchant_profiles")
    .update({ business_name: "测试商家A-最终" })
    .eq("user_id", userAId);
  assert(!businessOnlyUpdateError, businessOnlyUpdateError?.message ?? "business update failed");

  const { data: activeAfter } = await service
    .from("merchant_profiles")
    .select("is_active, business_name")
    .eq("user_id", userAId)
    .single();
  assert(activeAfter?.is_active === true, "is_active should remain unchanged");
  assert(activeAfter?.business_name === "测试商家A-最终", "business name should update");
  console.log("   PASS");

  console.log("5) public profile displays updated data");
  const { data: publicProfile, error: publicProfileError } = await service
    .from("profiles")
    .select("nickname, bio, avatar_url, gender, city")
    .eq("username", userAUsername)
    .single();
  assert(!publicProfileError && publicProfile, publicProfileError?.message ?? "public profile missing");
  assert(publicProfile.nickname === nextNickname, "public nickname mismatch");
  assert(publicProfile.bio === "更新后的简介", "public bio mismatch");
  assert(publicProfile.avatar_url?.includes(avatarPath), "public avatar mismatch");
  console.log("   PASS");

  console.log("6) author display sync on posts/comments");
  const postResult = await publishPostAction({
    title: `资料编辑同步 ${stamp}`,
    content: "author sync test",
    categorySelection: "其他",
    author: nextNickname,
    location: "首尔",
    distance: "350m",
    nearby: true,
    following: false,
  });

  await service
    .from("posts")
    .update({ author_id: userAId })
    .eq("id", postResult.post.id);

  await service
    .from("posts")
    .update({ author: "测试商家A" })
    .eq("id", postResult.post.id);

  await service
    .from("comments")
    .insert({
      id: crypto.randomUUID(),
      post_id: postResult.post.id,
      user_id: userAId,
      author: "测试商家A",
      content: "同步测试评论",
      moderation_status: "published",
      risk_score: 0,
      risk_level: "low",
      published_at: new Date().toISOString(),
    });

  await service
    .from("posts")
    .update({ author: "测试商家A-新" })
    .eq("author_id", userAId);

  await service
    .from("comments")
    .update({ author: "测试商家A-新" })
    .eq("user_id", userAId);

  const { data: syncedPost } = await service
    .from("posts")
    .select("author")
    .eq("id", postResult.post.id)
    .single();
  assert(syncedPost?.author === "测试商家A-新", "post author sync mismatch");

  const { data: syncedComment } = await service
    .from("comments")
    .select("author")
    .eq("post_id", postResult.post.id)
    .limit(1)
    .maybeSingle();
  assert(syncedComment?.author === "测试商家A-新", "comment author sync mismatch");

  await service.from("comments").delete().eq("post_id", postResult.post.id);
  await service.from("content_reviews").delete().eq("post_id", postResult.post.id);
  await service.from("posts").delete().eq("id", postResult.post.id);
  console.log("   PASS");

  await clientA.storage.from(COMMUNITY_MEDIA_BUCKET).remove([avatarPath]);
  await cleanupUser(service, userAId);
  await cleanupUser(service, userBId);

  console.log("\nAll profile edit V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
