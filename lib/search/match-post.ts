import type { Post } from "@/lib/data/posts";

export function postMatchesQuery(post: Post, needle: string): boolean {
  const normalizedNeedle = needle.toLowerCase();

  if (post.title.toLowerCase().includes(normalizedNeedle)) {
    return true;
  }

  if ((post.content ?? "").toLowerCase().includes(normalizedNeedle)) {
    return true;
  }

  if (post.author.toLowerCase().includes(normalizedNeedle)) {
    return true;
  }

  return false;
}

function postTimestamp(post: Post): number {
  if (post.createdAt) {
    return new Date(post.createdAt).getTime();
  }

  return post.id;
}

export function sortPostsByNewest(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => postTimestamp(b) - postTimestamp(a));
}
