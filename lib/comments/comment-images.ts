import { COMMUNITY_MEDIA_BUCKET } from "@/lib/supabase/storage";

export const MAX_COMMENT_IMAGES = 3;

export function buildCommentImageStoragePath(
  userId: string,
  commentId: string,
  fileName: string,
) {
  return `comment-images/${userId}/${commentId}/${Date.now()}-${fileName}`;
}

export function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${COMMUNITY_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

export function isValidCommentImageStoragePath(
  userId: string,
  commentId: string,
  storagePath: string,
) {
  const prefix = `comment-images/${userId}/${commentId}/`;
  if (!storagePath.startsWith(prefix)) {
    return false;
  }

  const fileName = storagePath.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/");
}
