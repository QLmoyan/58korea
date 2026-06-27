import { buildLoginHref } from "@/lib/auth/redirect";
import { buildPostSharePath } from "@/lib/share/paths";

const PENDING_FAVORITE_KEY = "58korea:pending-favorite-v1";

export function setPendingFavorite(postId: number) {
  if (typeof window === "undefined" || !Number.isFinite(postId)) {
    return;
  }

  window.sessionStorage.setItem(PENDING_FAVORITE_KEY, String(postId));
}

export function peekPendingFavorite(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_FAVORITE_KEY);
  if (!raw) {
    return null;
  }

  const postId = Number(raw);
  return Number.isFinite(postId) ? postId : null;
}

export function consumePendingFavorite(): number | null {
  const postId = peekPendingFavorite();
  if (postId == null || typeof window === "undefined") {
    return null;
  }

  window.sessionStorage.removeItem(PENDING_FAVORITE_KEY);
  return postId;
}

export function buildFavoriteLoginHref(postId: number): string {
  setPendingFavorite(postId);
  return buildLoginHref(buildPostSharePath(postId));
}
