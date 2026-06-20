"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { searchPosts } from "@/lib/search/search-posts";
import type { SearchState } from "@/lib/search/types";
import type { Post } from "@/lib/data/posts";

interface SearchStoreValue extends SearchState {
  runSearch: (query: string) => Promise<Post[]>;
  resetSearch: () => void;
}

const initialState: SearchState = {
  query: "",
  results: [],
  loading: false,
  error: null,
  searched: false,
};

const SearchStoreContext = createContext<SearchStoreValue | null>(null);

export function SearchStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SearchState>(initialState);

  const runSearch = useCallback(async (query: string) => {
    setState((current) => ({
      ...current,
      query,
      loading: true,
      error: null,
    }));

    try {
      const results = await searchPosts(query);
      setState({
        query,
        results,
        loading: false,
        error: null,
        searched: true,
      });
      return results;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "搜索失败，请稍后重试";
      setState({
        query,
        results: [],
        loading: false,
        error: message,
        searched: true,
      });
      return [];
    }
  }, []);

  const resetSearch = useCallback(() => {
    setState(initialState);
  }, []);

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
