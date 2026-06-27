/**
 * Read-only production audit for merchant pin. Run: npx tsx scripts/audit-prod-merchant-pin-readonly.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { sortPostsWithMerchantsFirst } from "../lib/merchant/sort-posts";
import {
  isMerchantPost,
  MERCHANT_AUTHOR_NAME,
  MERCHANT_USERNAME,
} from "../lib/merchant/identify";
import type { Database } from "../lib/supabase/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: merchantCandidates, error: mcErr } = await admin
    .from("posts")
    .select("id, title, author, created_at, moderation_status")
    .eq("moderation_status", "published")
    .or(`author.eq.${MERCHANT_AUTHOR_NAME},author.ilike.%全大胆%,author.ilike.%Mentor%,title.ilike.%认证%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (mcErr) throw new Error(mcErr.message);

  console.log(JSON.stringify({ section: "merchant_candidate_posts", rows: merchantCandidates ?? [] }));

  const { data: allPublished, error: allErr } = await admin
    .from("posts")
    .select("id, title, author, created_at")
    .eq("moderation_status", "published")
    .order("created_at", { ascending: false });

  if (allErr) throw new Error(allErr.message);

  const posts = allPublished ?? [];
  const sorted = sortPostsWithMerchantsFirst(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      author: p.author,
      createdAt: p.created_at,
      location: "",
      distance: "350m" as const,
      likes: 0,
      category: "其他" as const,
      imageUrl: null,
      imageHeight: null,
    })),
  );

  const top10Feed = sorted.slice(0, 10).map((post, index) => ({
    sortPosition: index + 1,
    id: post.id,
    title: post.title,
    author: post.author,
    authorJson: JSON.stringify(post.author),
    authorCodePoints: [...post.author].map((c) => c.codePointAt(0)),
    isVerifiedMerchant: isMerchantPost({ author: post.author }),
    created_at: post.createdAt,
  }));

  console.log(
    JSON.stringify({
      section: "feed_top10_after_sortPostsWithMerchantsFirst",
      expectedMerchantAuthor: MERCHANT_AUTHOR_NAME,
      expectedMerchantUsername: MERCHANT_USERNAME,
      isMerchantPostUsesAuthorOnly: true,
      rows: top10Feed,
    }),
  );

  const rawTop10 = posts.slice(0, 10).map((p, index) => ({
    sortPosition: index + 1,
    id: p.id,
    title: p.title,
    author: p.author,
    authorJson: JSON.stringify(p.author),
    isVerifiedMerchant: isMerchantPost({ author: p.author }),
    created_at: p.created_at,
  }));

  console.log(JSON.stringify({ section: "db_raw_top10_by_created_at_desc", rows: rawTop10 }));

  const uniqueAuthors = [...new Set(posts.map((p) => p.author))];
  const merchantLike = uniqueAuthors.filter((a) =>
    isMerchantPost({ author: a }),
  );
  console.log(
    JSON.stringify({
      section: "authors_matching_isMerchantPost",
      count: merchantLike.length,
      authors: merchantLike.map((a) => ({ author: a, json: JSON.stringify(a) })),
    }),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
