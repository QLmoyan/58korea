import { COMMUNITY_MEDIA_BUCKET } from "@/lib/supabase/storage";

export const AVATAR_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

export function buildAvatarStoragePath(userId: string, fileName: string) {
  return `avatars/${userId}/${fileName}`;
}

export function isValidAvatarStoragePath(userId: string, storagePath: string) {
  const prefix = `avatars/${userId}/`;
  if (!storagePath.startsWith(prefix)) {
    return false;
  }

  const fileName = storagePath.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/");
}

export function extractAvatarStoragePathFromPublicUrl(publicUrl: string) {
  const marker = `/storage/v1/object/public/${COMMUNITY_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(index + marker.length));
}
