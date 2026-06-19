import { createClientId } from "@/lib/utils/create-client-id";
import { getSupabaseClient } from "@/lib/supabase/client";

export const COMMUNITY_MEDIA_BUCKET = "community-media";

const MAX_POST_IMAGES = 9;

export interface UploadedPostImageDraft {
  storagePath: string;
  publicUrl: string;
  sortOrder: number;
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) {
    return fromName;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function createStorageFileName(file: File) {
  return `${createClientId()}.${getFileExtension(file)}`;
}

export function getPublicUrl(storagePath: string) {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function uploadPostImagesToStorage(
  postId: number,
  files: File[],
): Promise<UploadedPostImageDraft[]> {
  if (files.length === 0) {
    return [];
  }

  if (files.length > MAX_POST_IMAGES) {
    throw new Error(`最多上传 ${MAX_POST_IMAGES} 张图片`);
  }

  const supabase = getSupabaseClient();
  const uploadedDrafts: UploadedPostImageDraft[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const storagePath = `posts/${postId}/${createStorageFileName(file)}`;
      const { error: uploadError } = await supabase.storage
        .from(COMMUNITY_MEDIA_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);
      uploadedDrafts.push({
        storagePath,
        publicUrl: getPublicUrl(storagePath),
        sortOrder: index,
      });
    }

    return uploadedDrafts;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await removePostImagesFromStorage(uploadedPaths).catch((cleanupError) => {
        console.error("Failed to cleanup partially uploaded post images:", cleanupError);
      });
    }

    throw error;
  }
}

export async function removePostImagesFromStorage(
  storagePaths: string[],
): Promise<void> {
  if (storagePaths.length === 0) {
    return;
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .remove(storagePaths);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadCommentImage(commentId: string, file: File) {
  const supabase = getSupabaseClient();
  const storagePath = `comments/${commentId}/${createStorageFileName(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const publicUrl = getPublicUrl(storagePath);
  return { publicUrl, storagePath };
}
