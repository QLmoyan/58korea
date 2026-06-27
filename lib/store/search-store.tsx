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
import { searchMerchants } from "@/lib/search/search-merchants";
import { searchPosts } from "@/lib/search/search-posts";
import { searchUsers } from "@/lib/search/search-users";
import {
  isSearchQueryEmpty,
  normalizeSearchQuery,
} from "@/lib/search/normalize-query";
import type { SearchState } from "@/lib/search/types";

interface SearchStoreValue extends SearchState {
  runSearch: (query: string) => Promise<void>;
  resetSearch: () => void;
}

const initialState: SearchState = {
  query: "",
  postResults: [],
  userResults: [],
  merchantResults: [],
  loading: false,
  error: null,
  searched: false,
};

const SearchStoreContext = createContext<SearchStoreValue | null>(null);

export function SearchStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(initialState);
  const searchGenerationRef = useRef(0);

  const resetSearch = useCallback(() => {
    searchGenerationRef.current += 1;
    setState(initialState);
  }, []);

  const runSearch = useCallback(async (query: string) => {
    const normalized = normalizeSearchQuery(query);

    if (isSearchQueryEmpty(normalized)) {
      resetSearch();
      return;
    }

    const generation = searchGenerationRef.current + 1;
    searchGenerationRef.current = generation;

    setState((current) => ({
      ...current,
      query: normalized,
      loading: true,
      error: null,
    }));

    try {
      const [postResults, userResults, merchantResults] = await Promise.all([
        searchPosts(normalized),
        searchUsers(normalized),
        searchMerchants(normalized),
      ]);

      if (searchGenerationRef.current !== generation) {
        return;
      }

      setState({
        query: normalized,
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
        postResults: [],
        userResults: [],
        merchantResults: [],
        loading: false,
        error: message,
        searched: true,
      });
    }
  }, [resetSearch]);

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
