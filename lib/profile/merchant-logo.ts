import { COMMUNITY_MEDIA_BUCKET } from "@/lib/supabase/storage";

export const MERCHANT_LOGO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

export function buildMerchantLogoStoragePath(userId: string, fileName: string) {
  return `merchants/${userId}/logo/${fileName}`;
}

export function isValidMerchantLogoStoragePath(
  userId: string,
  storagePath: string,
) {
  const prefix = `merchants/${userId}/logo/`;
  if (!storagePath.startsWith(prefix)) {
    return false;
  }

  const fileName = storagePath.slice(prefix.length);
  return fileName.length > 0 && !fileName.includes("/");
}

export function extractMerchantLogoStoragePathFromPublicUrl(publicUrl: string) {
  const marker = `/storage/v1/object/public/${COMMUNITY_MEDIA_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(index + marker.length));
}
