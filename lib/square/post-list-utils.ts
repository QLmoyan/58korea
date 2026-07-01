import type { Post } from "@/lib/data/posts";
import { formatRelativeMessageTime } from "@/lib/messages/format-time";

export function resolvePostThumbnailUrl(post: Post): string | null {
  return post.imageUrl ?? post.images?.[0]?.url ?? null;
}

export function formatPostExcerpt(content: string | undefined | null): string {
  if (!content?.trim()) {
    return "";
  }

  return content.replace(/\s+/g, " ").trim();
}

export function formatPostListMeta(
  location: string | null | undefined,
  createdAt: string | undefined,
  commentCount: number,
): string {
  const parts: string[] = [];
  const place = location?.trim();
  const time = createdAt ? formatRelativeMessageTime(createdAt) : "";

  if (place) {
    parts.push(place);
  }

  if (time) {
    parts.push(time);
  }

  parts.push(`${commentCount} 评论`);

  return parts.join(" · ");
}
