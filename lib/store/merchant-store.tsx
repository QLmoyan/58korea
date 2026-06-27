"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MerchantSummary } from "@/lib/types/merchant";
import {
  buildMerchantHomeHref,
  fetchActiveMerchantSummaries,
  resolveMerchantForPost,
} from "@/lib/supabase/merchant-queries";
import { isSupabaseConfigured } from "@/lib/supabase/client";

interface MerchantStoreValue {
  merchants: MerchantSummary[];
  hydrated: boolean;
  refreshMerchants: () => Promise<void>;
  resolveMerchantForPost: (post: {
    author: string;
    authorId?: string | null;
  }) => MerchantSummary | null;
  getMerchantByUserId: (userId: string) => MerchantSummary | null;
  getMerchantHomeHref: (post: {
    author: string;
    authorId?: string | null;
  }) => string | null;
}

const MerchantStoreContext = createContext<MerchantStoreValue | null>(null);

export function MerchantStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [merchants, setMerchants] = useState<MerchantSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refreshMerchants = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMerchants([]);
      setHydrated(true);
      return;
    }

    try {
      const data = await fetchActiveMerchantSummaries();
      setMerchants(data);
    } catch (error) {
      console.error("Failed to refresh merchant profiles:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMerchants() {
      if (!isSupabaseConfigured()) {
        setMerchants([]);
        setHydrated(true);
        return;
      }

      try {
        const data = await fetchActiveMerchantSummaries();
        if (!cancelled) {
          setMerchants(data);
        }
      } catch (error) {
        console.error("Failed to load merchant profiles:", error);
        if (!cancelled) {
          setMerchants([]);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadMerchants();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolveMerchant = useCallback(
    (post: { author: string; authorId?: string | null }) =>
      resolveMerchantForPost(post, merchants),
    [merchants],
  );

  const getMerchantByUserId = useCallback(
    (userId: string) =>
      merchants.find((merchant) => merchant.userId === userId) ?? null,
    [merchants],
  );

  const getMerchantHomeHref = useCallback(
    (post: { author: string; authorId?: string | null }) => {
      const merchant = resolveMerchantForPost(post, merchants);
      if (!merchant?.username) {
        return null;
      }
      return buildMerchantHomeHref(merchant.username);
    },
    [merchants],
  );

  const value = useMemo(
    () => ({
      merchants,
      hydrated,
      refreshMerchants,
      resolveMerchantForPost: resolveMerchant,
      getMerchantByUserId,
      getMerchantHomeHref,
    }),
    [
      merchants,
      hydrated,
      refreshMerchants,
      resolveMerchant,
      getMerchantByUserId,
      getMerchantHomeHref,
    ],
  );

  return (
    <MerchantStoreContext.Provider value={value}>
      {children}
    </MerchantStoreContext.Provider>
  );
}

export function useMerchantStore() {
  const context = useContext(MerchantStoreContext);
  if (!context) {
    throw new Error("useMerchantStore must be used within MerchantStoreProvider");
  }
  return context;
}

export function useMerchantStoreOptional() {
  return useContext(MerchantStoreContext);
}
