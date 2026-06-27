import { normalizeUsername } from "@/lib/auth/username";

export function buildPublicProfileHref(username: string): string {
  return `/profile/${normalizeUsername(username)}`;
}

/** @deprecated Use buildPublicProfileHref */
export function buildUserHomeHref(username: string): string {
  return buildPublicProfileHref(username);
}
