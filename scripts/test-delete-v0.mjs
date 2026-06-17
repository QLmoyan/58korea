import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

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
  const rootCommentId = randomUUID();
  const replyCommentId = randomUUID();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title: `删除测试帖 ${stamp}`,
      content: "delete v0 integration test",
      author: "测试用户",
      location: "首尔",
      distance: "350m",
      likes: 0,
      category: "其他",
      image_url: null,
      image_height: 180,
      nearby: true,
      following: false,
    })
    .select("id")
    .single();

  assert(!postError, `Post insert failed: ${postError?.message}`);

  const { error: rootCommentError } = await supabase.from("comments").insert({
    id: rootCommentId,
    post_id: post.id,
    author: "测试用户",
    content: `根评论 ${stamp}`,
    parent_id: null,
    reply_to_author: null,
  });

  assert(!rootCommentError, `Root comment insert failed: ${rootCommentError?.message}`);

  const { error: replyCommentError } = await supabase.from("comments").insert({
    id: replyCommentId,
    post_id: post.id,
    author: "测试用户",
    content: `回复 ${stamp}`,
    parent_id: rootCommentId,
    reply_to_author: "测试用户",
  });

  assert(!replyCommentError, `Reply insert failed: ${replyCommentError?.message}`);

  const { error: deleteCommentError } = await supabase
    .from("comments")
    .delete()
    .eq("id", rootCommentId);

  assert(!deleteCommentError, `Delete root comment failed: ${deleteCommentError?.message}`);

  const { data: commentsAfterRootDelete, error: commentsAfterRootDeleteError } =
    await supabase.from("comments").select("id").eq("post_id", post.id);

  assert(
    !commentsAfterRootDeleteError,
    `Fetch comments failed: ${commentsAfterRootDeleteError?.message}`,
  );
  assert(
    (commentsAfterRootDelete ?? []).length === 0,
    "Reply should cascade delete when root comment is deleted",
  );

  const orphanCommentId = randomUUID();
  const { error: orphanCommentError } = await supabase.from("comments").insert({
    id: orphanCommentId,
    post_id: post.id,
    author: "测试用户",
    content: `单独评论 ${stamp}`,
    parent_id: null,
    reply_to_author: null,
  });

  assert(!orphanCommentError, `Orphan comment insert failed: ${orphanCommentError?.message}`);

  const { error: deletePostError } = await supabase
    .from("posts")
    .delete()
    .eq("id", post.id);

  assert(!deletePostError, `Delete post failed: ${deletePostError?.message}`);

  const { data: deletedPost, error: deletedPostError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", post.id)
    .maybeSingle();

  assert(!deletedPostError, `Fetch deleted post failed: ${deletedPostError?.message}`);
  assert(!deletedPost, "Post should be deleted");

  const { data: deletedComments, error: deletedCommentsError } = await supabase
    .from("comments")
    .select("id")
    .eq("post_id", post.id);

  assert(!deletedCommentsError, `Fetch deleted comments failed: ${deletedCommentsError?.message}`);
  assert((deletedComments ?? []).length === 0, "Comments should cascade delete with post");

  console.log("Delete V0 integration test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
