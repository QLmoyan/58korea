const CHANNEL_ARTICLE_COVER_PREFIX = "channel-articles/covers/";

export function isValidChannelArticleCoverStoragePath(storagePath: string) {
  return storagePath.startsWith(CHANNEL_ARTICLE_COVER_PREFIX);
}

export function buildChannelArticleCoverStoragePath(fileName: string) {
  return `${CHANNEL_ARTICLE_COVER_PREFIX}${fileName}`;
}
