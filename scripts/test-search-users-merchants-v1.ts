import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { registerUserAction } from "../lib/actions/register-user";
import { scoreUserMatch } from "../lib/search/match-score";
import { searchMerchants } from "../lib/search/search-merchants";
import { searchPosts } from "../lib/search/search-posts";
import { searchUsers } from "../lib/search/search-users";
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

  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;

  const service = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: publishedPost } = await service
    .from("posts")
    .select("title")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log("1) all tab can still search posts");
  if (publishedPost?.title) {
    const keyword = publishedPost.title.slice(0, 4);
    const posts = await searchPosts(keyword);
    assert(posts.length > 0, "post search should return published posts");
  } else {
    const posts = await searchPosts("韩国");
    assert(Array.isArray(posts), "post search should return an array");
  }
  console.log("   PASS");

  const stamp = Date.now();
  const password = "Test123456!";
  const username = `srch_u_${String(stamp).slice(-6)}`;
  const nickname = `搜索用户${String(stamp).slice(-4)}`;

  await registerUserAction({
    username,
    password,
    nickname,
    bio: `搜索测试简介 ${stamp}`,
  });

  console.log("2) users tab can search nickname / username");
  const users = await searchUsers(username.slice(-4));
  assert(users.some((user) => user.username === username), "user search by username");
  const usersByNickname = await searchUsers(nickname.slice(-2));
  assert(
    usersByNickname.some((user) => user.username === username),
    "user search by nickname",
  );
  assert(
    users[0]?.profileHref === `/profile/${username}`,
    "user result should link to profile page",
  );
  console.log("   PASS");

  console.log("3) merchants tab can search business_name");
  const { data: merchantProfile } = await service
    .from("merchant_profiles")
    .select("business_name, user_id")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  assert(merchantProfile?.business_name, "need at least one active merchant");

  const merchantKeyword = merchantProfile.business_name.slice(0, 2);
  const merchants = await searchMerchants(merchantKeyword);
  assert(
    merchants.some((merchant) =>
      merchant.businessName.includes(merchantKeyword),
    ),
    "merchant search should match business_name",
  );
  console.log("   PASS");

  console.log("4) search results link to /profile/[username]");
  assert(
    merchants.every((merchant) => merchant.profileHref.startsWith("/profile/")),
    "merchant results should link to profile pages",
  );
  assert(
    users.every((user) => user.profileHref.startsWith("/profile/")),
    "user results should link to profile pages",
  );
  console.log("   PASS");

  console.log("5) anon users can search public users and merchants");
  const { data: anonUsers, error: anonUsersError } = await anon
    .from("profiles")
    .select("username, nickname")
    .ilike("username", `%${username.slice(-4)}%`)
    .limit(5);
  assert(!anonUsersError, anonUsersError?.message ?? "anon user search failed");
  assert((anonUsers ?? []).length > 0, "anon should read searchable profiles");

  const { data: anonMerchants, error: anonMerchantsError } = await anon
    .from("merchant_profiles")
    .select("business_name")
    .eq("is_active", true)
    .ilike("business_name", `%${merchantKeyword}%`)
    .limit(5);
  assert(
    !anonMerchantsError,
    anonMerchantsError?.message ?? "anon merchant search failed",
  );
  assert((anonMerchants ?? []).length > 0, "anon should read active merchants");
  console.log("   PASS");

  console.log("6) user search ranks exact username before bio-only match");
  const rankKeyword = `srank${String(stamp).slice(-4)}`;
  const bioUsername = `srank_bio_${String(stamp).slice(-6)}`;
  const exactUsername = rankKeyword;

  await registerUserAction({
    username: bioUsername,
    password,
    nickname: `昵称${String(stamp).slice(-4)}`,
    bio: `简介里包含${rankKeyword}`,
  });

  await registerUserAction({
    username: exactUsername,
    password: `${password}!`,
    nickname: `${rankKeyword}昵称`,
    bio: "普通简介",
  });

  const rankedUsers = await searchUsers(rankKeyword);
  assert(
    rankedUsers[0]?.username === exactUsername,
    "exact username match should rank first",
  );
  assert(
    rankedUsers.some((user) => user.username === bioUsername),
    "bio-only fixture user should still appear in results",
  );
  assert(
    scoreUserMatch(rankedUsers[0], rankKeyword) >
      scoreUserMatch(
        rankedUsers.find((user) => user.username === bioUsername)!,
        rankKeyword,
      ),
    "exact username score should beat bio-only match",
  );
  console.log("   PASS");

  console.log("\nAll search users/merchants V1 tests passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
