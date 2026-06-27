import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import { AUTO_POST_SEED_MARKER, AUTO_POST_TEMPLATES } from "../lib/auto-post/templates";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    process.env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
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

  const { data: posts, error } = await admin
    .from("posts")
    .select("id, title, category, content, image_url, created_at")
    .like("content", `%${AUTO_POST_SEED_MARKER}%`)
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = posts ?? [];
  const imageCounts = new Map<number, number>();

  for (const post of rows) {
    const { count } = await admin
      .from("post_images")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id);
    imageCounts.set(post.id, count ?? 0);
  }

  console.log(JSON.stringify({ dbSeedPostCount: rows.length }));

  for (const template of AUTO_POST_TEMPLATES) {
    const marker = `${AUTO_POST_SEED_MARKER}#${template.seedId}`;
    const match = rows.find((row) => row.content?.includes(marker));
    console.log(
      JSON.stringify({
        seedId: template.seedId,
        title: template.title,
        category: template.category,
        dbPostId: match?.id ?? null,
        imageCount: match ? imageCounts.get(match.id) ?? 0 : 0,
        hasCover: Boolean(match?.image_url),
      }),
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
