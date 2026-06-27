import {
  MERCHANT_USERNAME,
  isVerifiedMerchantAccount,
} from "@/lib/merchant/identify";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import { resolveMerchantForPost } from "@/lib/supabase/merchant-queries";
import type { MerchantSummary } from "@/lib/types/merchant";

export function resolveAuthorProfileHref(input: {
  author: string;
  authorId?: string | null;
  authorUsername?: string | null;
  merchants?: MerchantSummary[];
}): string | null {
  const merchants = input.merchants ?? [];

  if (input.authorUsername?.trim()) {
    return buildPublicProfileHref(input.authorUsername);
  }

  const merchant = resolveMerchantForPost(
    { author: input.author, authorId: input.authorId },
    merchants,
  );
  if (merchant?.username) {
    return buildPublicProfileHref(merchant.username);
  }

  if (isVerifiedMerchantAccount({ author: input.author })) {
    return buildPublicProfileHref(MERCHANT_USERNAME);
  }

  return null;
}
