"use client";

import { MERCHANT_USERNAME, isMerchantPost } from "@/lib/merchant/identify";
import { resolveAuthorProfileHref } from "@/lib/merchant/resolve-author-profile-href";
import { useMerchantStoreOptional } from "@/lib/store/merchant-store";

export function usePostAuthorContext(post: {
  author: string;
  authorId?: string | null;
  authorUsername?: string | null;
}) {
  const store = useMerchantStoreOptional();
  const merchant = store?.resolveMerchantForPost(post) ?? null;
  const legacyMerchant = isMerchantPost(post);
  const isMerchant = Boolean(merchant) || legacyMerchant;
  const authorHomeHref = resolveAuthorProfileHref({
    author: post.author,
    authorId: post.authorId,
    authorUsername: post.authorUsername,
    merchants: store?.merchants,
  });

  return { isMerchant, authorHomeHref };
}

/** @deprecated Use usePostAuthorContext */
export function usePostMerchantContext(post: {
  author: string;
  authorId?: string | null;
  authorUsername?: string | null;
}) {
  const { isMerchant, authorHomeHref } = usePostAuthorContext(post);
  return { isMerchant, merchantHref: authorHomeHref };
}
