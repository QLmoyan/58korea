"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import PostFeed from "@/components/home/PostFeed";
import SearchTabs from "@/components/search/SearchTabs";
import { SEARCH_EMPTY_MESSAGE } from "@/lib/search/constants";
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
  const { results, loading, error, searched, runSearch } = useSearchStore();

  useEffect(() => {
    if (!normalizedUrlQuery) {
      return;
    }

    void runSearch(normalizedUrlQuery);
  }, [normalizedUrlQuery, runSearch]);

  function handleSearch(nextQuery: string) {
    const normalized = normalizeSearchQuery(nextQuery);
    const nextUrl = normalized
      ? `/search?q=${encodeURIComponent(normalized)}`
      : "/search";

    router.replace(nextUrl);
  }

  const showEmptyState =
    searched && !loading && !error && normalizedUrlQuery.length > 0 && results.length === 0;

  const showPrompt =
    !normalizedUrlQuery && !loading && !searched;

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
            />
          </div>
        </div>

        <div className="px-0 pb-1 lg:px-0">
          <SearchTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      <main className="pt-2">
        {loading ? (
          <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">搜索中...</p>
          </section>
        ) : null}

        {error ? (
          <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-rose-500">{error}</p>
          </section>
        ) : null}

        {showPrompt ? (
          <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-500">
              输入关键词，搜索帖子标题、正文或作者
            </p>
          </section>
        ) : null}

        {activeTab === "all" && normalizedUrlQuery && !loading && !error ? (
          <PostFeed
            posts={results}
            emptyMessage={showEmptyState ? SEARCH_EMPTY_MESSAGE : undefined}
          />
        ) : null}

        {activeTab !== "all" ? (
          <section className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="text-sm font-medium text-zinc-400">功能开发中</p>
          </section>
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
