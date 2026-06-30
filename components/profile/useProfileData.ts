"use client";

import { useMemo } from "react";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";
import { getDisplayUsername } from "@/lib/auth/username";
import { getOwnedPostIds } from "@/lib/local/owned-content";
import { isVerifiedMerchantAccount } from "@/lib/merchant/identify";
import { useVerifiedMerchant } from "@/lib/merchant/use-verified-merchant";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePostStore } from "@/lib/store/post-store";

export function useProfileData() {
  const { user, profile } = useAuthStore();
  const displayUsername = getDisplayUsername(user);
  const authorName = resolveAuthorNameFromAuth(user, profile);
  const nickname = profile?.nickname?.trim() || authorName;
  const bio = profile?.bio?.trim() || "";
  const { posts, hydrated, favoritePosts, historyPosts, engagementHydrated, feedError, reloadFeed } =
    usePostStore();
  const {
    profile: merchantDetails,
    summary: merchantSummary,
    isVerifiedMerchant,
    loading: merchantDetailsLoading,
  } = useVerifiedMerchant(user?.id);
  const legacyMerchant = isVerifiedMerchantAccount({
    author: authorName,
    username: displayUsername,
  });
  const isMerchant = isVerifiedMerchant || legacyMerchant;

  const displayName = useMemo(() => {
    if (merchantDetails?.businessName?.trim()) {
      return merchantDetails.businessName.trim();
    }

    if (merchantSummary?.businessName?.trim()) {
      return merchantSummary.businessName.trim();
    }

    return nickname;
  }, [merchantDetails, merchantSummary, nickname]);

  const displayBio = useMemo(() => {
    if (merchantDetails?.description?.trim()) {
      return merchantDetails.description.trim();
    }

    return bio;
  }, [merchantDetails, bio]);

  const avatarUrl = useMemo(() => {
    if (profile?.avatarUrl?.trim()) {
      return profile.avatarUrl.trim();
    }

    if (merchantDetails?.logoUrl?.trim()) {
      return merchantDetails.logoUrl.trim();
    }

    return null;
  }, [profile?.avatarUrl, merchantDetails?.logoUrl]);

  const myPosts = useMemo(() => {
    if (!user) {
      return [];
    }

    const ownedIds = new Set(getOwnedPostIds());

    return posts.filter(
      (post) => post.author === authorName || ownedIds.has(post.id),
    );
  }, [posts, user, authorName]);

  const totalLikes = useMemo(
    () => myPosts.reduce((sum, post) => sum + post.likes, 0),
    [myPosts],
  );

  const favoriteCount = favoritePosts.length;

  return {
    user,
    profile,
    displayUsername,
    authorName,
    nickname,
    displayName,
    bio,
    displayBio,
    avatarUrl,
    isMerchant,
    merchantDetails,
    merchantDetailsLoading,
    myPosts,
    totalLikes,
    favoritePosts,
    favoriteCount,
    historyPosts,
    hydrated,
    engagementHydrated,
    feedError,
    reloadFeed,
  };
}
