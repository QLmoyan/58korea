"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FeedChannel } from "@/lib/data/posts";
import type { SelectedRegion } from "@/lib/feed/regions";
import {
  parseSearchContext,
  type ParsedSearchContext,
} from "@/lib/search/parse-search-context";
import { searchMerchants } from "@/lib/search/search-merchants";
import { searchPosts } from "@/lib/search/search-posts";
import { searchUsers } from "@/lib/search/search-users";
import {
  isSearchQueryEmpty,
  normalizeSearchQuery,
} from "@/lib/search/normalize-query";
import type { SearchState } from "@/lib/search/types";

export interface RunSearchOptions {
  channel: FeedChannel;
  selectedRegion: SelectedRegion;
}

interface SearchStoreValue extends SearchState {
  runSearch: (query: string, options: RunSearchOptions) => Promise<void>;
  resetSearch: () => void;
}

const initialState: SearchState = {
  query: "",
  context: null,
  postResults: [],
  userResults: [],
  merchantResults: [],
  loading: false,
  error: null,
  searched: false,
};

const SearchStoreContext = createContext<SearchStoreValue | null>(null);

function resolveSortMode(
  source: ParsedSearchContext["source"],
): "recommend" | "latest" {
  return source === "global-latest" ? "latest" : "recommend";
}

export function SearchStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(initialState);
  const searchGenerationRef = useRef(0);

  const resetSearch = useCallback(() => {
    searchGenerationRef.current += 1;
    setState(initialState);
  }, []);

  const runSearch = useCallback(
    async (query: string, options: RunSearchOptions) => {
      const normalized = normalizeSearchQuery(query);

      if (isSearchQueryEmpty(normalized)) {
        resetSearch();
        return;
      }

      const context = parseSearchContext({
        rawQuery: normalized,
        currentChannel: options.channel,
        selectedRegion: options.selectedRegion,
      });

      if (
        isSearchQueryEmpty(context.keyword) &&
        !context.place
      ) {
        resetSearch();
        return;
      }

      const generation = searchGenerationRef.current + 1;
      searchGenerationRef.current = generation;
      const sortMode = resolveSortMode(context.source);

      setState((current) => ({
        ...current,
        query: normalized,
        context,
        loading: true,
        error: null,
      }));

      try {
        const keyword = context.keyword;
        const [postResults, userResults, merchantResults] = await Promise.all([
          searchPosts({
            keyword,
            place: context.place,
            sortMode,
          }),
          isSearchQueryEmpty(keyword)
            ? Promise.resolve([])
            : searchUsers(keyword),
          searchMerchants({
            keyword,
            place: context.place,
            sortMode,
          }),
        ]);

        if (searchGenerationRef.current !== generation) {
          return;
        }

        setState({
          query: normalized,
          context,
          postResults,
          userResults,
          merchantResults,
          loading: false,
          error: null,
          searched: true,
        });
      } catch (error) {
        if (searchGenerationRef.current !== generation) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "搜索失败，请稍后重试";
        setState({
          query: normalized,
          context,
          postResults: [],
          userResults: [],
          merchantResults: [],
          loading: false,
          error: message,
          searched: true,
        });
      }
    },
    [resetSearch],
  );

  const value = useMemo(
    () => ({
      ...state,
      runSearch,
      resetSearch,
    }),
    [state, runSearch, resetSearch],
  );

  return (
    <SearchStoreContext.Provider value={value}>
      {children}
    </SearchStoreContext.Provider>
  );
}

export function useSearchStore() {
  const context = useContext(SearchStoreContext);

  if (!context) {
    throw new Error("useSearchStore must be used within SearchStoreProvider");
  }

  return context;
}
