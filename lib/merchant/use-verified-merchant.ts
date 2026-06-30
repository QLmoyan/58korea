"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMerchantProfileByUserId } from "@/lib/supabase/merchant-queries";
import { useMerchantStoreOptional } from "@/lib/store/merchant-store";
import type { MerchantProfile } from "@/lib/types/merchant";
import type { MerchantSummary } from "@/lib/types/merchant";

export interface VerifiedMerchantState {
  profile: MerchantProfile | null;
  summary: MerchantSummary | null;
  isVerifiedMerchant: boolean;
  merchantProfileId: string;
  loading: boolean;
}

/**
 * Canonical client-side verified merchant state for the logged-in user.
 * Uses merchant_profiles.user_id + is_active + is_verified (direct fetch),
 * with merchant-store as a secondary cache for summaries used in feeds.
 */
export function useVerifiedMerchant(userId: string | undefined): VerifiedMerchantState {
  const merchantStore = useMerchantStoreOptional();
  const refreshMerchants = merchantStore?.refreshMerchants;
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const activeUserId = userId;
    setLoading(true);

    async function load() {
      try {
        await refreshMerchants?.();
        const verifiedProfile = await fetchMerchantProfileByUserId(activeUserId);
        if (!cancelled) {
          setProfile(verifiedProfile);
        }
      } catch (error) {
        console.error("Failed to load verified merchant profile:", error);
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshMerchants]);

  const summary = userId
    ? merchantStore?.getMerchantByUserId(userId) ?? null
    : null;

  return useMemo(() => {
    const isVerifiedMerchant = Boolean(profile?.isVerified && profile.isActive);
    const merchantProfileId =
      profile?.id ?? summary?.merchantProfileId ?? "";

    return {
      profile,
      summary,
      isVerifiedMerchant,
      merchantProfileId,
      loading,
    };
  }, [profile, summary, loading]);
}
