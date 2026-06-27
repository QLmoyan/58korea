import type { SearchMerchantResult } from "@/lib/search/types";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import { normalizeUsername } from "@/lib/auth/username";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildIlikeOrFilter,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/escape-ilike";
import { scoreMerchantMatch, sortBySearchRank } from "@/lib/search/match-score";
import { isSearchQueryEmpty, normalizeSearchQuery } from "@/lib/search/normalize-query";

const MERCHANT_SEARCH_SELECT =
  "id, user_id, business_name, logo_url, description, address, business_hours, created_at, updated_at";

type MerchantSearchRow = {
  id: string;
  user_id: string;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  business_hours: string | null;
  created_at: string;
  updated_at: string;
};

function mapSearchMerchant(
  row: MerchantSearchRow,
  username: string,
): SearchMerchantResult | null {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    return null;
  }

  return {
    id: row.id,
    username: normalizedUsername,
    businessName: row.business_name,
    logoUrl: row.logo_url,
    description: row.description,
    address: row.address,
    businessHours: row.business_hours,
    profileHref: buildPublicProfileHref(normalizedUsername),
  };
}

export async function searchMerchants(query: string): Promise<SearchMerchantResult[]> {
  const normalized = normalizeSearchQuery(query);
  if (isSearchQueryEmpty(normalized) || !isSupabaseConfigured()) {
    return [];
  }

  const patternFilter = buildIlikeOrFilter(
    ["business_name", "description", "address", "phone"],
    normalized,
  );
  if (!patternFilter) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("merchant_profiles")
    .select(MERCHANT_SEARCH_SELECT)
    .eq("is_active", true)
    .or(patternFilter)
    .limit(SEARCH_RESULT_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const merchants = (data ?? []) as MerchantSearchRow[];
  if (merchants.length === 0) {
    return [];
  }

  const userIds = merchants.map((merchant) => merchant.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const usernameByUserId = new Map(
    (profiles ?? [])
      .filter((profile) => profile.username?.trim())
      .map((profile) => [profile.id, profile.username!.trim()]),
  );

  const ranked = merchants
    .map((merchant) => {
      const username = usernameByUserId.get(merchant.user_id);
      if (!username) {
        return null;
      }

      const result = mapSearchMerchant(merchant, username);
      if (!result) {
        return null;
      }

      return { result, merchant };
    })
    .filter(
      (
        item,
      ): item is { result: SearchMerchantResult; merchant: MerchantSearchRow } =>
        item !== null,
    );

  const sorted = sortBySearchRank(ranked, {
    scoreOf: ({ merchant }) =>
      scoreMerchantMatch(
        {
          businessName: merchant.business_name,
          description: merchant.description,
          address: merchant.address,
        },
        normalized,
      ),
    timestampOf: ({ merchant }) => merchant.updated_at || merchant.created_at,
  });

  return sorted.map(({ result }) => result);
}
