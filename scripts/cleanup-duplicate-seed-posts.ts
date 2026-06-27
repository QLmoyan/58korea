import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

  const duplicateIds = [190, 191, 192, 193, 194, 195];

  for (const postId of duplicateIds) {
    const { data: images } = await admin
      .from("post_images")
      .select("storage_path")
      .eq("post_id", postId);

    for (const image of images ?? []) {
      await admin.storage.from("community-media").remove([image.storage_path]);
    }

    await admin.from("post_images").delete().eq("post_id", postId);
    await admin.from("content_reviews").delete().eq("post_id", postId);
    await admin.from("posts").delete().eq("id", postId);
    console.log(JSON.stringify({ deletedPostId: postId }));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
