"use client";

import { useEffect, useRef } from "react";
import { consumePendingFavorite } from "@/lib/engagement/pending-favorite";
import { useAuthStore } from "@/lib/store/auth-store";
import { usePostStore } from "@/lib/store/post-store";

export function usePendingFavoriteOnLogin(postId: number) {
  const { user } = useAuthStore();
  const { engagementHydrated, isPostFavorited, toggleFavorite } = usePostStore();
  const handledRef = useRef(false);

  useEffect(() => {
    handledRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (
      handledRef.current ||
      !user ||
      !engagementHydrated ||
      !Number.isFinite(postId)
    ) {
      return;
    }

    const pendingPostId = consumePendingFavorite();
    if (pendingPostId !== postId || isPostFavorited(postId)) {
      return;
    }

    handledRef.current = true;

    void toggleFavorite(postId).catch((error) => {
      console.error("Failed to complete pending favorite:", error);
      handledRef.current = false;
    });
  }, [
    user?.id,
    engagementHydrated,
    postId,
    isPostFavorited,
    toggleFavorite,
  ]);
}
