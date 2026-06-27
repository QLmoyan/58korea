import type { Metadata } from "next";
import {
  DEFAULT_OG_IMAGE_PATH,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/share/constants";
import { toAbsoluteUrl } from "@/lib/share/site-url";

function resolveOgImageUrl(imagePath?: string | null): string {
  return toAbsoluteUrl(imagePath?.trim() || DEFAULT_OG_IMAGE_PATH);
}

export function buildRootMetadata(): Metadata {
  const title = `${SITE_NAME} - ${SITE_TAGLINE}`;
  const description = "租房、招聘、二手交易、求助、攻略分享、搭子活动";
  const imageUrl = resolveOgImageUrl();

  return {
    metadataBase: new URL(getMetadataBaseOrigin()),
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      locale: "zh_CN",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function getMetadataBaseOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl.startsWith("http") ? siteUrl.replace(/\/$/, "") : `https://${siteUrl.replace(/\/$/, "")}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export function buildShareMetadata(input: {
  title: string;
  description: string;
  path: string;
  imagePath?: string | null;
}): Metadata {
  const imageUrl = resolveOgImageUrl(input.imagePath);
  const canonical = toAbsoluteUrl(input.path);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "zh_CN",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: input.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [imageUrl],
    },
  };
}

export function truncateDescription(value: string, maxLength = 120): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trim()}…`;
}
