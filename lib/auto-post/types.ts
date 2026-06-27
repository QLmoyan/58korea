import type { PostCategory, PostDistance } from "@/lib/data/posts";

export type ImageSource = "pexels" | "unsplash" | "pixabay" | "curated";

export interface AutoPostImageCandidate {
  url: string;
  width: number;
  height: number;
  keyword: string;
  source: ImageSource;
}

export interface AutoPostTemplate {
  /** Stable id for logging; matches legacy mock post id (1–20). */
  seedId: number;
  title: string;
  content: string;
  author: string;
  location: string;
  distance: PostDistance;
  likes: number;
  category: PostCategory;
  nearby?: boolean;
  following?: boolean;
  /** Chinese/English tokens that must appear in title and content. */
  topicKeywords: string[];
  /** Allowed image search/display keywords for this post. */
  allowedImageKeywords: string[];
  /** Image topics that must never be used for this post. */
  forbiddenImageKeywords: string[];
  /** Primary English query for stock photo APIs. */
  imageSearchQuery: string;
  /** Real photo URLs when APIs are unavailable or return no match. */
  curatedImages: AutoPostImageCandidate[];
  /** Target image count (1–3). */
  imageCount: 1 | 2 | 3;
  /** Curated images only — copy is written to match these photos. */
  imageFirst?: boolean;
  /** Abort publish when no image uploads succeed. Defaults to true when imageFirst. */
  requireImages?: boolean;
}

export interface PublishAutoPostResult {
  postId: number;
  imageCount: number;
}

export interface AutoPostLogEntry {
  seedId: number;
  title: string;
  imageKeyword: string | null;
  imageSource: ImageSource | "none" | "skipped";
  status: "published" | "skipped" | "dry-run" | "exists";
  reason?: string;
  imageCount?: number;
}

export interface ResolvedAutoPostImages {
  images: AutoPostImageCandidate[];
  primaryKeyword: string;
  primarySource: ImageSource;
}
