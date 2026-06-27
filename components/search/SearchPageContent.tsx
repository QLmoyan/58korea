"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import PostFeed from "@/components/home/PostFeed";
import SearchMerchantResultItem from "@/components/search/SearchMerchantResultItem";
import SearchTabs from "@/components/search/SearchTabs";
import SearchUserResultItem from "@/components/search/SearchUserResultItem";
import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_EMPTY_MERCHANT_MESSAGE,
  SEARCH_EMPTY_MESSAGE,
  SEARCH_EMPTY_USER_MESSAGE,
} from "@/lib/search/constants";
import { normalizeSearchQuery } from "@/lib/search/normalize-query";
import type { SearchTabId } from "@/lib/search/types";
import { SearchStoreProvider, useSearchStore } from "@/lib/store/search-store";

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") ?? "";
  const normalizedUrlQuery = useMemo(
    () => normalizeSearchQuery(queryFromUrl),
    [queryFromUrl],
  );
  const [activeTab, setActiveTab] = useState<SearchTabId>("all");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    postResults,
    userResults,
    merchantResults,
    loading,
    error,
    searched,
    runSearch,
    resetSearch,
  } = useSearchStore();

  useEffect(() => {
    if (!normalizedUrlQuery) {
      resetSearch();
      return;
    }

    void runSearch(normalizedUrlQuery);
  }, [normalizedUrlQuery, runSearch, resetSearch]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const navigateToQuery = useCallback(
    (nextQuery: string) => {
      const normalized = normalizeSearchQuery(nextQuery);
      const nextUrl = normalized
        ? `/search?q=${encodeURIComponent(normalized)}`
        : "/search";

      router.replace(nextUrl);
    },
    [router],
  );

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      clearDebounceTimer();
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        navigateToQuery(nextQuery);
      }, SEARCH_DEBOUNCE_MS);
    },
    [clearDebounceTimer, navigateToQuery],
  );

  const handleSearch = useCallback(
    (nextQuery: string) => {
      clearDebounceTimer();
      navigateToQuery(nextQuery);
    },
    [clearDebounceTimer, navigateToQuery],
  );

  const showPrompt = !normalizedUrlQuery && !loading && !searched;

  const activeResults =
    activeTab === "all"
      ? postResults
      : activeTab === "users"
        ? userResults
        : merchantResults;

  const emptyMessage =
    activeTab === "users"
      ? SEARCH_EMPTY_USER_MESSAGE
      : activeTab === "merchants"
        ? SEARCH_EMPTY_MERCHANT_MESSAGE
        : SEARCH_EMPTY_MESSAGE;

  const showEmptyState =
    searched &&
    !loading &&
    !error &&
    normalizedUrlQuery.length > 0 &&
    activeResults.length === 0;

  const showResults = normalizedUrlQuery.length > 0 && !error;

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-zinc-50 pb-8 lg:max-w-[920px]">
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 lg:px-0">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
            aria-label="返回首页"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <HomeSearchBar
              defaultQuery={normalizedUrlQuery}
              autoFocus
              onSearch={handleSearch}
              onQueryChange={handleQueryChange}
            />
          </div>
        </div>

        <div className="px-0 pb-1 lg:px-0">
          <SearchTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {loading && normalizedUrlQuery ? (
          <p className="px-4 pb-2 text-center text-xs text-zinc-400">搜索中...</p>
        ) : null}

        {error ? (
          <div className="flex items-center justify-center gap-3 px-4 pb-2 text-center">
            <p className="text-xs text-rose-500">{error}</p>
            <button
              type="button"
              onClick={() => void runSearch(normalizedUrlQuery)}
              className="text-xs font-medium text-rose-600 underline-offset-2 hover:underline"
            >
              重试
            </button>
          </div>
        ) : null}
      </header>

      <main className="pt-2">
        {showPrompt ? (
          <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">
              输入关键词，搜索帖子、用户或商家
            </p>
          </section>
        ) : null}

        {activeTab === "all" && showResults ? (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            <PostFeed
              posts={postResults}
              emptyMessage={showEmptyState ? emptyMessage : undefined}
              highlightQuery={normalizedUrlQuery}
            />
          </div>
        ) : null}

        {activeTab === "users" && showResults ? (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            {showEmptyState ? (
              <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
              </section>
            ) : (
              <div className="bg-white lg:rounded-2xl lg:ring-1 lg:ring-zinc-100">
                {userResults.map((user) => (
                  <SearchUserResultItem
                    key={user.id}
                    user={user}
                    highlightQuery={normalizedUrlQuery}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "merchants" && showResults ? (
          <div className={loading ? "opacity-60 transition-opacity" : ""}>
            {showEmptyState ? (
              <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
              </section>
            ) : (
              <div className="bg-white lg:rounded-2xl lg:ring-1 lg:ring-zinc-100">
                {merchantResults.map((merchant) => (
                  <SearchMerchantResultItem
                    key={merchant.id}
                    merchant={merchant}
                    highlightQuery={normalizedUrlQuery}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function SearchPageContent() {
  return (
    <SearchStoreProvider>
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center bg-zinc-50">
            <p className="text-sm text-zinc-400">加载中...</p>
          </div>
        }
      >
        <SearchPageInner />
      </Suspense>
    </SearchStoreProvider>
  );
}

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
