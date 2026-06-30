import type { SearchMerchantResult } from "@/lib/search/types";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import { normalizeUsername } from "@/lib/auth/username";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildIlikeOrFilter,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/escape-ilike";
import { filterMerchantsByPlace } from "@/lib/search/filter-by-place";
import { scoreMerchantMatch, sortBySearchRank } from "@/lib/search/match-score";
import { isSearchQueryEmpty, normalizeSearchQuery } from "@/lib/search/normalize-query";
import type { SearchPostsSortMode } from "@/lib/search/search-posts";

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

export interface SearchMerchantsOptions {
  keyword: string;
  place?: string | null;
  sortMode?: SearchPostsSortMode;
}

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

function sortMerchants(
  items: Array<{ result: SearchMerchantResult; merchant: MerchantSearchRow }>,
  keyword: string,
  sortMode: SearchPostsSortMode,
) {
  if (sortMode === "latest") {
    return items.slice().sort((left, right) => {
      const leftTime = Date.parse(
        left.merchant.updated_at || left.merchant.created_at,
      );
      const rightTime = Date.parse(
        right.merchant.updated_at || right.merchant.created_at,
      );
      return rightTime - leftTime;
    });
  }

  if (isSearchQueryEmpty(keyword)) {
    return items.slice().sort((left, right) => {
      const leftTime = Date.parse(
        left.merchant.updated_at || left.merchant.created_at,
      );
      const rightTime = Date.parse(
        right.merchant.updated_at || right.merchant.created_at,
      );
      return rightTime - leftTime;
    });
  }

  return sortBySearchRank(items, {
    scoreOf: ({ merchant }) =>
      scoreMerchantMatch(
        {
          businessName: merchant.business_name,
          description: merchant.description,
          address: merchant.address,
        },
        keyword,
      ),
    timestampOf: ({ merchant }) => merchant.updated_at || merchant.created_at,
  });
}

export async function searchMerchants(
  queryOrOptions: string | SearchMerchantsOptions,
): Promise<SearchMerchantResult[]> {
  const options: SearchMerchantsOptions =
    typeof queryOrOptions === "string"
      ? { keyword: queryOrOptions }
      : queryOrOptions;

  const keyword = normalizeSearchQuery(options.keyword);
  const place = options.place?.trim() || null;
  const sortMode = options.sortMode ?? "recommend";

  if (isSearchQueryEmpty(keyword) && !place) {
    return [];
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from("merchant_profiles")
    .select(MERCHANT_SEARCH_SELECT)
    .eq("is_active", true)
    .eq("is_verified", true);

  if (!isSearchQueryEmpty(keyword)) {
    const patternFilter = buildIlikeOrFilter(
      ["business_name", "description", "address", "phone"],
      keyword,
    );
    if (!patternFilter) {
      return [];
    }
    query = query.or(patternFilter);
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query.limit(SEARCH_RESULT_LIMIT);

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

  const filtered = filterMerchantsByPlace(
    ranked.map(({ result }) => result),
    place,
  );
  const filteredIds = new Set(filtered.map((merchant) => merchant.id));
  const filteredRanked = ranked.filter(({ result }) => filteredIds.has(result.id));

  const sorted = sortMerchants(filteredRanked, keyword, sortMode);

  return sorted.map(({ result }) => result);
}
