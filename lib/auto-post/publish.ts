import { randomUUID } from "node:crypto";
import { loadModerationRules } from "@/lib/moderation/load-rules";
import { scoreContent } from "@/lib/moderation/score-content";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { preparePostImages } from "./prepare-images";
import type {
  AutoPostImageCandidate,
  AutoPostTemplate,
  PublishAutoPostResult,
} from "./types";

const COMMUNITY_MEDIA_BUCKET = "community-media";

function guessExtension(contentType: string): string {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("webp")) {
    return "webp";
  }
  return "jpg";
}

function estimateImageHeight(width: number, height: number): number {
  const ratio = height / Math.max(width, 1);
  return Math.max(140, Math.min(280, Math.round(400 * ratio)));
}

function requiresImages(template: AutoPostTemplate): boolean {
  return template.requireImages ?? Boolean(template.imageFirst);
}

export async function publishAutoPost(
  template: AutoPostTemplate,
  images: AutoPostImageCandidate[],
  seedMarker: string,
): Promise<PublishAutoPostResult> {
  const mustHaveImages = requiresImages(template);
  const prepared = await preparePostImages(template, images);

  if (mustHaveImages && prepared.length === 0) {
    throw new Error("未找到可用图片，放弃发布");
  }

  const rules = await loadModerationRules();
  const contentWithMarker = `${template.content}\n\n${seedMarker}#${template.seedId}`;
  const decision = scoreContent(
    {
      targetType: "post",
      title: template.title,
      content: contentWithMarker,
      category: template.category,
    },
    rules,
  );

  if (decision.rejected) {
    throw new Error(decision.reasonMessage ?? "内容未通过审核");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const isPublished = decision.moderationStatus === "published";

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      title: template.title,
      content: contentWithMarker,
      author: template.author,
      location: template.location,
      distance: template.distance,
      likes: template.likes,
      category: template.category,
      image_url: null,
      image_height: 180,
      nearby: template.nearby ?? false,
      following: template.following ?? false,
      moderation_status: decision.moderationStatus,
      risk_score: decision.riskScore,
      risk_level: decision.riskLevel,
      published_at: isPublished ? now : null,
      moderation_note: decision.userMessage ?? null,
    })
    .select("id")
    .single();

  if (postError || !post) {
    throw new Error(postError?.message ?? "发帖失败");
  }

  if (prepared.length === 0) {
    return { postId: post.id, imageCount: 0 };
  }

  const rows: Array<{
    post_id: number;
    storage_path: string;
    public_url: string;
    sort_order: number;
    width: number | null;
    height: number | null;
  }> = [];

  for (const [index, item] of prepared.entries()) {
    const extension = guessExtension(item.contentType);
    const storagePath = `posts/${post.id}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .upload(storagePath, item.buffer, {
        contentType: item.contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`图片上传失败: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(COMMUNITY_MEDIA_BUCKET)
      .getPublicUrl(storagePath);

    rows.push({
      post_id: post.id,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      sort_order: index,
      width: item.candidate.width ?? null,
      height: item.candidate.height ?? null,
    });
  }

  const { error: imageInsertError } = await supabase.from("post_images").insert(rows);
  if (imageInsertError) {
    await supabase.from("posts").delete().eq("id", post.id);
    throw new Error(`图片关联失败: ${imageInsertError.message}`);
  }

  const cover = prepared[0].candidate;
  const { error: coverUpdateError } = await supabase
    .from("posts")
    .update({
      image_url: rows[0].public_url,
      image_height: estimateImageHeight(cover.width, cover.height),
    })
    .eq("id", post.id);

  if (coverUpdateError) {
    throw new Error(`封面更新失败: ${coverUpdateError.message}`);
  }

  return { postId: post.id, imageCount: rows.length };
}

export async function findExistingSeedPost(
  template: AutoPostTemplate,
  seedMarker: string,
): Promise<number | null> {
  const supabase = getSupabaseAdminClient();
  const marker = `${seedMarker}#${template.seedId}`;

  const { data, error } = await supabase
    .from("posts")
    .select("id")
    .like("content", `%${marker}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}
