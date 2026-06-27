import { createClientId } from "@/lib/utils/create-client-id";
import {
  buildCommentImageStoragePath,
  MAX_COMMENT_IMAGES,
} from "@/lib/comments/comment-images";
import { getSupabaseClient } from "@/lib/supabase/client";

export const COMMUNITY_MEDIA_BUCKET = "community-media";
export const COMMENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

const MAX_POST_IMAGES = 9;

export interface UploadedPostImageDraft {
  storagePath: string;
  publicUrl: string;
  sortOrder: number;
}

export interface UploadedCommentImageDraft {
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
        throw new Error(`图片上传失败：${uploadError.message}`);
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

    if (error instanceof Error && !/图片上传失败/i.test(error.message)) {
      throw new Error(`图片上传失败：${error.message}`);
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

export async function uploadAvatarToStorage(
  userId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const timestamp = Date.now();
  const extension = getFileExtension(file) === "png" ? "png" : "jpg";
  const storagePath = `avatars/${userId}/${timestamp}.${extension}`;
  const supabase = getSupabaseClient();

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    storagePath,
    publicUrl: getPublicUrl(storagePath),
  };
}

export async function uploadMerchantLogoToStorage(
  userId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const { buildMerchantLogoStoragePath } = await import(
    "@/lib/profile/merchant-logo"
  );
  const timestamp = Date.now();
  const extension = getFileExtension(file) === "png" ? "png" : "jpg";
  const storagePath = buildMerchantLogoStoragePath(
    userId,
    `${timestamp}.${extension}`,
  );
  const supabase = getSupabaseClient();

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    storagePath,
    publicUrl: getPublicUrl(storagePath),
  };
}

export async function uploadChannelArticleCoverToStorage(
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const { buildChannelArticleCoverStoragePath } = await import(
    "@/lib/channels/cover-storage"
  );
  const storagePath = buildChannelArticleCoverStoragePath(createStorageFileName(file));
  const supabase = getSupabaseClient();

  const { error: uploadError } = await supabase.storage
    .from(COMMUNITY_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return {
    storagePath,
    publicUrl: getPublicUrl(storagePath),
  };
}

export async function uploadCommentImagesToStorage(
  userId: string,
  commentId: string,
  files: File[],
): Promise<UploadedCommentImageDraft[]> {
  if (files.length === 0) {
    return [];
  }

  if (files.length > MAX_COMMENT_IMAGES) {
    throw new Error(`最多上传 ${MAX_COMMENT_IMAGES} 张图片`);
  }

  const supabase = getSupabaseClient();
  const uploadedDrafts: UploadedCommentImageDraft[] = [];
  const uploadedPaths: string[] = [];

  try {
    for (const [index, file] of files.entries()) {
      const storagePath = buildCommentImageStoragePath(
        userId,
        commentId,
        createStorageFileName(file),
      );
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
        console.error("Failed to cleanup partially uploaded comment images:", cleanupError);
      });
    }

    throw error;
  }
}

/** @deprecated Use uploadCommentImagesToStorage */
export async function uploadCommentImage(commentId: string, file: File) {
  const storagePath = `comments/${commentId}/${createStorageFileName(file)}`;
  const supabase = getSupabaseClient();

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
