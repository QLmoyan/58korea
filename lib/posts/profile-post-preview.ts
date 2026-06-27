import type { Post } from "@/lib/data/posts";

export function getPostCoverUrl(post: Post): string | null {
  if (post.imageUrl) {
    return post.imageUrl;
  }

  const firstImage = post.images?.[0];
  return firstImage?.url ?? null;
}

export function hasPostCover(post: Post): boolean {
  return getPostCoverUrl(post) !== null;
}

export function getPostTitle(post: Post): string {
  return post.title?.trim() || "无标题";
}

export function getPostContentPreview(post: Post): string | null {
  const content = post.content?.trim();
  return content || null;
}
