import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const BUCKET = "community-media";
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

function createTestPng(label) {
  const path = resolve(process.cwd(), "scripts", `.test-${label}.png`);
  writeFileSync(path, Buffer.from(PNG_BASE64, "base64"));
  return { path, buffer: readFileSync(path), name: `${label}.png`, type: "image/png" };
}

function cleanup(paths) {
  for (const path of paths) {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
}

async function insertPost(supabase, title, content) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title,
      content,
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
    .select("id, image_url")
    .single();

  assert(!error, `Post insert failed: ${error?.message}`);
  return data;
}

async function uploadPostImages(supabase, postId, files) {
  const rows = [];

  for (const [index, file] of files.entries()) {
    const storagePath = `posts/${postId}/${randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.type,
        upsert: false,
      });

    assert(!uploadError, `Post storage upload failed: ${uploadError?.message}`);

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const { data, error: insertError } = await supabase
      .from("post_images")
      .insert({
        post_id: postId,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
        sort_order: index,
      })
      .select("id, public_url, sort_order")
      .single();

    assert(!insertError, `post_images insert failed: ${insertError?.message}`);
    rows.push(data);
  }

  return rows;
}

async function fetchPostById(supabase, postId) {
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, title, image_url, post_images(id, public_url, sort_order)")
    .eq("id", postId)
    .single();

  assert(!postError, `Post select failed: ${postError?.message}`);

  const images = (post.post_images ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => ({
      id: row.id,
      public_url: row.public_url,
      sort_order: row.sort_order,
    }));

  const coverUrl = post.image_url ?? images[0]?.public_url ?? null;

  return { post: { ...post, image_url: coverUrl }, images };
}

async function insertCommentWithOptionalImage(
  supabase,
  postId,
  content,
  file,
  parentId = null,
  replyToAuthor = null,
) {
  const commentId = randomUUID();
  let imageUrl = null;
  let imageStoragePath = null;

  if (file) {
    const storagePath = `comments/${commentId}/${randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.type,
        upsert: false,
      });

    assert(!uploadError, `Comment storage upload failed: ${uploadError?.message}`);

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    imageUrl = publicUrlData.publicUrl;
    imageStoragePath = storagePath;
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      id: commentId,
      post_id: postId,
      author: parentId ? "隔壁邻居" : "热心华人",
      content,
      parent_id: parentId,
      reply_to_author: replyToAuthor,
      image_url: imageUrl,
      image_storage_path: imageStoragePath,
    })
    .select("id, author, content, image_url, parent_id")
    .single();

  assert(!error, `Comment insert failed: ${error?.message}`);
  return data;
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
  const tempPaths = [];
  const results = {};

  console.log("=== 图片上传 V1 联调 ===\n");

  // 1. 无图发帖
  console.log("[1/6] 无图发帖...");
  const noImagePost = await insertPost(
    supabase,
    `无图帖 ${stamp}`,
    "no image post",
  );
  const noImageDetail = await fetchPostById(supabase, noImagePost.id);
  assert(noImageDetail.images.length === 0, "无图帖不应有 post_images 记录");
  assert(!noImageDetail.post.image_url, "无图帖 image_url 应为空");
  results.noImagePostId = noImagePost.id;
  console.log(`  OK post_id=${noImagePost.id}, cover=null, images=0`);

  // 2. 1张图发帖
  console.log("[2/6] 1张图发帖...");
  const oneImageFile = createTestPng(`one-${stamp}`);
  tempPaths.push(oneImageFile.path);
  const oneImagePost = await insertPost(
    supabase,
    `单图帖 ${stamp}`,
    "single image post",
  );
  const oneImageRows = await uploadPostImages(supabase, oneImagePost.id, [oneImageFile]);
  const oneImageDetail = await fetchPostById(supabase, oneImagePost.id);
  assert(oneImageDetail.images.length === 1, "单图帖应有 1 张图");
  assert(oneImageDetail.post.image_url, "单图帖应有封面（来自 post_images）");
  assert(
    oneImageDetail.post.image_url === oneImageRows[0].public_url,
    "封面应等于第一张图",
  );
  results.oneImagePostId = oneImagePost.id;
  console.log(
    `  OK post_id=${oneImagePost.id}, cover=${oneImageDetail.post.image_url.slice(0, 60)}...`,
  );

  // 3. 多图发帖
  console.log("[3/6] 多图发帖 (3张)...");
  const multiFiles = [0, 1, 2].map((index) => {
    const file = createTestPng(`multi-${stamp}-${index}`);
    tempPaths.push(file.path);
    return file;
  });
  const multiImagePost = await insertPost(
    supabase,
    `多图帖 ${stamp}`,
    "multi image post",
  );
  const multiImageRows = await uploadPostImages(
    supabase,
    multiImagePost.id,
    multiFiles,
  );
  assert(multiImageRows.length === 3, "应上传 3 张图");
  results.multiImagePostId = multiImagePost.id;
  console.log(`  OK post_id=${multiImagePost.id}, uploaded=3`);

  // 4. 帖子详情页展示全部图片
  console.log("[4/6] 帖子详情全部图片...");
  const multiImageDetail = await fetchPostById(supabase, multiImagePost.id);
  assert(multiImageDetail.images.length === 3, "详情应返回 3 张图");
  assert(
    multiImageDetail.images.every((row, index) => row.sort_order === index),
    "图片 sort_order 应连续",
  );
  assert(
    multiImageDetail.post.image_url === multiImageDetail.images[0].public_url,
    "封面应为首图",
  );
  console.log(
    `  OK post_id=${multiImagePost.id}, detail_images=${multiImageDetail.images.length}`,
  );

  // 5. 评论带1张图
  console.log("[5/6] 评论带1张图...");
  const commentFile = createTestPng(`comment-${stamp}`);
  tempPaths.push(commentFile.path);
  const commentWithImage = await insertCommentWithOptionalImage(
    supabase,
    multiImagePost.id,
    `带图评论 ${stamp}`,
    commentFile,
  );
  assert(commentWithImage.image_url, "评论应有 image_url");
  assert(!commentWithImage.parent_id, "应为根评论");
  results.commentId = commentWithImage.id;
  console.log(`  OK comment_id=${commentWithImage.id}, has_image=true`);

  // 6. 回复带1张图
  console.log("[6/6] 回复带1张图...");
  const replyFile = createTestPng(`reply-${stamp}`);
  tempPaths.push(replyFile.path);
  const replyWithImage = await insertCommentWithOptionalImage(
    supabase,
    multiImagePost.id,
    `带图回复 ${stamp}`,
    replyFile,
    commentWithImage.id,
    commentWithImage.author,
  );
  assert(replyWithImage.image_url, "回复应有 image_url");
  assert(replyWithImage.parent_id === commentWithImage.id, "回复 parent_id 应正确");
  results.replyId = replyWithImage.id;
  console.log(`  OK reply_id=${replyWithImage.id}, parent=${commentWithImage.id}`);

  cleanup(tempPaths);

  console.log("\n=== 全部通过 ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error("\nFAILED:", error.message ?? error);
  process.exit(1);
});
