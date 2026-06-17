import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
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
  const tinyPngPath = resolve(process.cwd(), "scripts", ".test-pixel.png");
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  writeFileSync(tinyPngPath, Buffer.from(pngBase64, "base64"));

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title: `图片上传测试 ${stamp}`,
      content: "image upload test",
      author: "社区网友",
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
  assert(post?.id, "Post id missing");

  const storagePath = `posts/${post.id}/test-${stamp}.png`;
  const fileBuffer = readFileSync(tinyPngPath);
  const { error: uploadError } = await supabase.storage
    .from("community-media")
    .upload(storagePath, fileBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  assert(!uploadError, `Storage upload failed: ${uploadError?.message}`);

  const { data: publicUrlData } = supabase.storage
    .from("community-media")
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;
  assert(publicUrl, "Public URL missing");

  const { data: postImage, error: postImageError } = await supabase
    .from("post_images")
    .insert({
      post_id: post.id,
      storage_path: storagePath,
      public_url: publicUrl,
      sort_order: 0,
    })
    .select("id, public_url")
    .single();

  assert(!postImageError, `post_images insert failed: ${postImageError?.message}`);

  const { data: postImages, error: selectImagesError } = await supabase
    .from("post_images")
    .select("id, public_url, sort_order")
    .eq("post_id", post.id)
    .order("sort_order", { ascending: true });

  assert(!selectImagesError, `post_images select failed: ${selectImagesError?.message}`);
  assert(postImages?.length === 1, "Expected 1 post image row");

  const { data: updatedPost, error: postSelectError } = await supabase
    .from("posts")
    .select("image_url")
    .eq("id", post.id)
    .single();

  assert(!postSelectError, `Post select failed: ${postSelectError?.message}`);
  assert(updatedPost?.image_url, "Cover image_url was not synced by trigger");

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author: "热心华人",
      content: `带图评论 ${stamp}`,
      parent_id: null,
      reply_to_author: null,
      image_url: null,
      image_storage_path: null,
    })
    .select("id")
    .single();

  assert(!commentError, `Comment insert failed: ${commentError?.message}`);

  const commentStoragePath = `comments/${comment.id}/test-${stamp}.png`;
  const { error: commentUploadError } = await supabase.storage
    .from("community-media")
    .upload(commentStoragePath, fileBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  assert(
    !commentUploadError,
    `Comment storage upload failed: ${commentUploadError?.message}`,
  );

  const { data: commentPublicUrlData } = supabase.storage
    .from("community-media")
    .getPublicUrl(commentStoragePath);

  const { data: updatedComment, error: commentUpdateError } = await supabase
    .from("comments")
    .update({
      image_url: commentPublicUrlData.publicUrl,
      image_storage_path: commentStoragePath,
    })
    .eq("id", comment.id)
    .select("id, image_url")
    .single();

  assert(
    !commentUpdateError,
    `Comment image update failed: ${commentUpdateError?.message}`,
  );
  assert(updatedComment?.image_url, "Comment image_url missing");

  unlinkSync(tinyPngPath);

  console.log("Image upload test passed");
  console.log(`post_id=${post.id}, comment_id=${comment.id}`);
  console.log(`cover=${updatedPost.image_url}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
