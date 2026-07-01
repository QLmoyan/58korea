const CHANNEL_ARTICLE_INLINE_IMAGE_PREFIX = "channel-articles/inline/";

export function isValidChannelArticleInlineImageStoragePath(storagePath: string) {
  return storagePath.startsWith(CHANNEL_ARTICLE_INLINE_IMAGE_PREFIX);
}

export function buildChannelArticleInlineImageStoragePath(fileName: string) {
  return `${CHANNEL_ARTICLE_INLINE_IMAGE_PREFIX}${fileName}`;
}
