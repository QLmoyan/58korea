import type { SearchUserResult } from "@/lib/search/types";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";
import { normalizeUsername } from "@/lib/auth/username";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  buildIlikeOrFilter,
  SEARCH_RESULT_LIMIT,
} from "@/lib/search/escape-ilike";
import { scoreUserMatch, sortBySearchRank } from "@/lib/search/match-score";
import { isSearchQueryEmpty, normalizeSearchQuery } from "@/lib/search/normalize-query";

const PROFILE_SEARCH_SELECT =
  "id, nickname, username, bio, avatar_url, created_at, updated_at";

type ProfileSearchRow = {
  id: string;
  nickname: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

function mapSearchUser(row: ProfileSearchRow): SearchUserResult | null {
  const username = row.username?.trim();
  if (!username) {
    return null;
  }

  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    return null;
  }

  return {
    id: row.id,
    username: normalizedUsername,
    nickname: row.nickname,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    profileHref: buildPublicProfileHref(normalizedUsername),
  };
}

export async function searchUsers(query: string): Promise<SearchUserResult[]> {
  const normalized = normalizeSearchQuery(query);
  if (isSearchQueryEmpty(normalized) || !isSupabaseConfigured()) {
    return [];
  }

  const patternFilter = buildIlikeOrFilter(
    ["username", "nickname", "bio"],
    normalized,
  );
  if (!patternFilter) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SEARCH_SELECT)
    .not("username", "is", null)
    .or(patternFilter)
    .limit(SEARCH_RESULT_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProfileSearchRow[];
  const ranked = rows
    .map((row) => {
      const result = mapSearchUser(row);
      if (!result) {
        return null;
      }

      return { result, row };
    })
    .filter((item): item is { result: SearchUserResult; row: ProfileSearchRow } => item !== null);

  const sorted = sortBySearchRank(ranked, {
    scoreOf: ({ result, row }) =>
      scoreUserMatch(
        {
          username: result.username,
          nickname: result.nickname,
          bio: row.bio,
        },
        normalized,
      ),
    timestampOf: ({ row }) => row.updated_at || row.created_at,
  });

  return sorted.map(({ result }) => result);
}
