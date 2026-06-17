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

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    env[key] = value;
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

  const supabase = createClient(url, anonKey);

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id")
    .order("id", { ascending: true })
    .limit(1);

  assert(!postsError, `Failed to load posts: ${postsError?.message}`);
  assert(posts?.[0]?.id, "No posts available for testing");

  const postId = posts[0].id;
  const stamp = Date.now();

  const { data: rootComment, error: rootError } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author: "测试用户",
      content: `一级留言 ${stamp}`,
      parent_id: null,
      reply_to_author: null,
    })
    .select("*")
    .single();

  assert(!rootError, `Failed to insert root comment: ${rootError?.message}`);
  assert(rootComment?.id, "Root comment id missing");

  const { data: replyComment, error: replyError } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author: "回复用户",
      content: `二级回复 ${stamp}`,
      parent_id: rootComment.id,
      reply_to_author: "测试用户",
    })
    .select("*")
    .single();

  assert(!replyError, `Failed to insert reply: ${replyError?.message}`);
  assert(
    replyComment.parent_id === rootComment.id,
    "Reply parent_id mismatch",
  );
  assert(
    replyComment.reply_to_author === "测试用户",
    "Reply reply_to_author mismatch",
  );

  const { data: nestedReply, error: nestedReplyError } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author: "再回复用户",
      content: `回复二级留言 ${stamp}`,
      parent_id: rootComment.id,
      reply_to_author: "回复用户",
    })
    .select("*")
    .single();

  assert(
    !nestedReplyError,
    `Failed to insert nested reply: ${nestedReplyError?.message}`,
  );
  assert(
    nestedReply.parent_id === rootComment.id,
    "Nested reply should attach to root comment",
  );

  const { data: allComments, error: fetchError } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  assert(!fetchError, `Failed to fetch comments: ${fetchError?.message}`);

  const inserted = (allComments ?? []).filter((comment) =>
    String(comment.content).includes(String(stamp)),
  );

  assert(inserted.length === 3, `Expected 3 test comments, got ${inserted.length}`);

  console.log("Comment reply integration test passed");
  console.log(`post_id=${postId}, inserted=${inserted.length}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
