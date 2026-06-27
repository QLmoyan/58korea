"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveAuthorNameFromAuth } from "@/lib/auth/author";
import { getDisplayUsername } from "@/lib/auth/username";
import {
  getOwnedCommentIds,
  getOwnedPostIds,
} from "@/lib/local/owned-content";
import {
  isVerifiedMerchantAccount,
} from "@/lib/merchant/identify";
import { useAuthStore } from "@/lib/store/auth-store";
import { useMerchantStoreOptional } from "@/lib/store/merchant-store";
import { usePostStore } from "@/lib/store/post-store";
import { fetchMerchantProfileByUserId } from "@/lib/supabase/merchant-queries";
import type { MerchantProfile } from "@/lib/types/merchant";

export function useProfileData() {
  const { user, profile } = useAuthStore();
  const { posts, comments, hydrated, favoritePosts, historyPosts, engagementHydrated, feedError, reloadFeed } =
    usePostStore();
  const merchantStore = useMerchantStoreOptional();
  const [merchantDetails, setMerchantDetails] = useState<MerchantProfile | null>(
    null,
  );
  const [merchantDetailsLoading, setMerchantDetailsLoading] = useState(false);

  const displayUsername = getDisplayUsername(user);
  const authorName = resolveAuthorNameFromAuth(user, profile);
  const nickname = profile?.nickname?.trim() || authorName;
  const bio = profile?.bio?.trim() || "";
  const merchantSummary = user?.id
    ? merchantStore?.getMerchantByUserId(user.id) ?? null
    : null;
  const legacyMerchant = isVerifiedMerchantAccount({
    author: authorName,
    username: displayUsername,
  });
  const isMerchant = Boolean(merchantSummary) || Boolean(merchantDetails) || legacyMerchant;

  useEffect(() => {
    let cancelled = false;

    async function loadMerchantDetails() {
      if (!user?.id || (!merchantSummary && !legacyMerchant)) {
        setMerchantDetails(null);
        setMerchantDetailsLoading(false);
        return;
      }

      setMerchantDetailsLoading(true);

      try {
        const details = await fetchMerchantProfileByUserId(user.id);
        if (!cancelled) {
          setMerchantDetails(details);
        }
      } catch (error) {
        console.error("Failed to load merchant profile:", error);
        if (!cancelled) {
          setMerchantDetails(null);
        }
      } finally {
        if (!cancelled) {
          setMerchantDetailsLoading(false);
        }
      }
    }

    void loadMerchantDetails();

    return () => {
      cancelled = true;
    };
  }, [user?.id, merchantSummary, legacyMerchant]);

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

  const myComments = useMemo(() => {
    if (!user) {
      return [];
    }

    const ownedIds = new Set(getOwnedCommentIds());

    return comments
      .filter(
        (comment) =>
          comment.author === authorName || ownedIds.has(comment.id),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [comments, user, authorName]);

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
    myComments,
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
