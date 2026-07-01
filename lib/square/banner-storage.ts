const SQUARE_BANNER_IMAGE_PREFIX = "square-banners/";

export function isValidSquareBannerImageStoragePath(storagePath: string) {
  return storagePath.startsWith(SQUARE_BANNER_IMAGE_PREFIX);
}

export function buildSquareBannerImageStoragePath(fileName: string) {
  return `${SQUARE_BANNER_IMAGE_PREFIX}${fileName}`;
}
