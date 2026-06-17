import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }

  return env;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  assert(url, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const stamp = Date.now();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title: `游客发帖测试 ${stamp}`,
      content: "guest post test",
      author: "社区网友",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: `https://picsum.photos/seed/guest-post-${stamp}/400/480`,
      image_height: 180,
      nearby: true,
      following: false,
    })
    .select("id, author")
    .single();

  assert(!postError, `Guest post insert failed: ${postError?.message}`);
  assert(post?.id, "Guest post id missing");

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author: "热心华人",
      content: `游客留言测试 ${stamp}`,
      parent_id: null,
      reply_to_author: null,
    })
    .select("id, author")
    .single();

  assert(!commentError, `Guest comment insert failed: ${commentError?.message}`);

  const { data: reply, error: replyError } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author: "隔壁邻居",
      content: `游客回复测试 ${stamp}`,
      parent_id: comment.id,
      reply_to_author: comment.author,
    })
    .select("id")
    .single();

  assert(!replyError, `Guest reply insert failed: ${replyError?.message}`);

  console.log("Guest write test passed");
  console.log(`post_id=${post.id}, author=${post.author}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
