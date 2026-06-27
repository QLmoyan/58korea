import type { AutoPostImageCandidate, AutoPostTemplate, ImageSource, ResolvedAutoPostImages } from "./types";
import { keywordMatches } from "./keywords";

interface ImageApiConfig {
  pexelsApiKey?: string;
  unsplashAccessKey?: string;
  pixabayApiKey?: string;
}

function pickKeyword(template: AutoPostTemplate, alt?: string): string {
  if (alt && template.allowedImageKeywords.some((allowed) => keywordMatches(allowed, alt))) {
    return alt;
  }
  return template.allowedImageKeywords[0] ?? template.imageSearchQuery;
}

function dedupeByUrl(images: AutoPostImageCandidate[]): AutoPostImageCandidate[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.url)) {
      return false;
    }
    seen.add(image.url);
    return true;
  });
}

async function searchPexels(
  template: AutoPostTemplate,
  query: string,
  perPage: number,
  apiKey: string,
): Promise<AutoPostImageCandidate[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    photos?: Array<{
      src?: { large?: string; large2x?: string; portrait?: string };
      width?: number;
      height?: number;
      alt?: string;
    }>;
  };

  const results: AutoPostImageCandidate[] = [];

  for (const photo of payload.photos ?? []) {
    const imageUrl = photo.src?.large2x ?? photo.src?.large ?? photo.src?.portrait;
    if (!imageUrl) {
      continue;
    }

    results.push({
      url: imageUrl,
      width: photo.width ?? 800,
      height: photo.height ?? 600,
      keyword: pickKeyword(template, photo.alt ?? query),
      source: "pexels",
    });
  }

  return results;
}

async function searchUnsplash(
  template: AutoPostTemplate,
  query: string,
  perPage: number,
  accessKey: string,
): Promise<AutoPostImageCandidate[]> {
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("content_filter", "high");

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    results?: Array<{
      urls?: { regular?: string; small?: string };
      width?: number;
      height?: number;
      alt_description?: string | null;
      description?: string | null;
    }>;
  };

  const results: AutoPostImageCandidate[] = [];

  for (const photo of payload.results ?? []) {
    const imageUrl = photo.urls?.regular ?? photo.urls?.small;
    if (!imageUrl) {
      continue;
    }

    results.push({
      url: `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}w=800&q=80`,
      width: photo.width ?? 800,
      height: photo.height ?? 600,
      keyword: pickKeyword(
        template,
        photo.alt_description ?? photo.description ?? query,
      ),
      source: "unsplash",
    });
  }

  return results;
}

async function searchPixabay(
  template: AutoPostTemplate,
  query: string,
  perPage: number,
  apiKey: string,
): Promise<AutoPostImageCandidate[]> {
  const url = new URL("https://pixabay.com/api/");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("image_type", "photo");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("safesearch", "true");

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    hits?: Array<{
      largeImageURL?: string;
      webformatURL?: string;
      imageWidth?: number;
      imageHeight?: number;
      tags?: string;
    }>;
  };

  const results: AutoPostImageCandidate[] = [];

  for (const hit of payload.hits ?? []) {
    const imageUrl = hit.largeImageURL ?? hit.webformatURL;
    if (!imageUrl) {
      continue;
    }

    results.push({
      url: imageUrl,
      width: hit.imageWidth ?? 800,
      height: hit.imageHeight ?? 600,
      keyword: pickKeyword(template, hit.tags ?? query),
      source: "pixabay",
    });
  }

  return results;
}

function filterCandidates(
  template: AutoPostTemplate,
  candidates: AutoPostImageCandidate[],
): AutoPostImageCandidate[] {
  return candidates.filter((candidate) => {
    const keyword = candidate.keyword.toLowerCase();
    if (
      template.forbiddenImageKeywords.some((forbidden) =>
        keyword.includes(forbidden.toLowerCase()),
      )
    ) {
      return false;
    }

    return template.allowedImageKeywords.some((allowed) =>
      keywordMatches(allowed, candidate.keyword),
    );
  });
}

function pickCurated(template: AutoPostTemplate): AutoPostImageCandidate[] {
  return template.curatedImages.map((image) => ({
    ...image,
    keyword: pickKeyword(template, image.keyword),
  }));
}

async function searchAllSources(
  template: AutoPostTemplate,
  count: number,
  config: ImageApiConfig,
): Promise<{ images: AutoPostImageCandidate[]; source: ImageSource | null }> {
  const query = template.imageSearchQuery;
  const perPage = Math.max(count, 3);

  if (config.pexelsApiKey) {
    const pexels = filterCandidates(
      template,
      await searchPexels(template, query, perPage, config.pexelsApiKey),
    );
    if (pexels.length >= 1) {
      return { images: dedupeByUrl(pexels).slice(0, count), source: "pexels" };
    }
  }

  if (config.unsplashAccessKey) {
    const unsplash = filterCandidates(
      template,
      await searchUnsplash(template, query, perPage, config.unsplashAccessKey),
    );
    if (unsplash.length >= 1) {
      return { images: dedupeByUrl(unsplash).slice(0, count), source: "unsplash" };
    }
  }

  if (config.pixabayApiKey) {
    const pixabay = filterCandidates(
      template,
      await searchPixabay(template, query, perPage, config.pixabayApiKey),
    );
    if (pixabay.length >= 1) {
      return { images: dedupeByUrl(pixabay).slice(0, count), source: "pixabay" };
    }
  }

  return { images: [], source: null };
}

export async function resolveAutoPostImages(
  template: AutoPostTemplate,
  config: ImageApiConfig = {},
): Promise<ResolvedAutoPostImages | null> {
  const curated = pickCurated(template);

  if (template.imageFirst) {
    if (curated.length === 0) {
      return null;
    }

    return {
      images: curated,
      primaryKeyword: curated[0].keyword,
      primarySource: curated[0].source,
    };
  }

  const count = Math.min(Math.max(template.imageCount, 1), 3);
  const apiResult = await searchAllSources(template, count, config);

  if (apiResult.images.length > 0 && apiResult.source) {
    const images = apiResult.images.map((image) => ({
      ...image,
      keyword: pickKeyword(template, image.keyword),
    }));

    return {
      images,
      primaryKeyword: images[0].keyword,
      primarySource: apiResult.source,
    };
  }

  if (curated.length === 0) {
    return null;
  }

  return {
    images: curated,
    primaryKeyword: curated[0].keyword,
    primarySource: curated[0].source,
  };
}

export function loadImageApiConfig(): ImageApiConfig {
  return {
    pexelsApiKey: process.env.PEXELS_API_KEY,
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
    pixabayApiKey: process.env.PIXABAY_API_KEY,
  };
}
