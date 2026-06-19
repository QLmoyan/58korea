import { normalizeUsername } from "@/lib/auth/username";

export const MERCHANT_USERNAME = "ql860430";
export const MERCHANT_AUTHOR_NAME = "全大胆";
export const MERCHANT_DISPLAY_NAME = MERCHANT_AUTHOR_NAME;

export interface MerchantIdentityInput {
  author?: string | null;
  username?: string | null;
}

export function isVerifiedMerchantAccount(
  input: MerchantIdentityInput,
): boolean {
  const author = input.author?.trim() ?? "";
  const username = input.username ? normalizeUsername(input.username) : "";

  return (
    username === MERCHANT_USERNAME || author === MERCHANT_AUTHOR_NAME
  );
}

export function isMerchantPost(post: {
  author: string;
  username?: string | null;
}): boolean {
  return isVerifiedMerchantAccount({
    author: post.author,
    username: post.username,
  });
}

export function isMerchantAuthorComment(
  postAuthor: string,
  commentAuthor: string,
  postUsername?: string | null,
): boolean {
  return (
    isVerifiedMerchantAccount({
      author: postAuthor,
      username: postUsername,
    }) && postAuthor === commentAuthor
  );
}

export function getMerchantDisplayName(): string {
  return MERCHANT_DISPLAY_NAME;
}

export function buildMerchantNavigationHref(location: string): string {
  const params = new URLSearchParams({
    merchant: MERCHANT_DISPLAY_NAME,
    location: location.trim() || "未知位置",
  });

  return `/merchant-navigation?${params.toString()}`;
}
