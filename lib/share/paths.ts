import { normalizeUsername } from "@/lib/auth/username";

export function buildPostSharePath(postId: number): string {
  return `/posts/${postId}`;
}

export function buildProfileSharePath(username: string): string {
  return `/profile/${normalizeUsername(username)}`;
}
