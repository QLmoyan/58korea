export interface SquareBannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
}

export function isExternalSquareBannerLink(linkUrl: string | null | undefined) {
  const link = linkUrl?.trim();
  if (!link) {
    return false;
  }

  return link.startsWith("http://") || link.startsWith("https://");
}

export function resolveSquareBannerHref(linkUrl: string | null | undefined) {
  const link = linkUrl?.trim();
  if (!link) {
    return null;
  }

  if (isExternalSquareBannerLink(link)) {
    return link;
  }

  return link.startsWith("/") ? link : `/${link}`;
}
