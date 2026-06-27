"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { SEARCH_PLACEHOLDER } from "@/lib/search/constants";
import { normalizeSearchQuery } from "@/lib/search/normalize-query";

interface HomeSearchBarProps {
  variant?: "mobile" | "desktop";
  defaultQuery?: string;
  autoFocus?: boolean;
  showButton?: boolean;
  onSearch?: (query: string) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
}

export default function HomeSearchBar({
  variant = "mobile",
  defaultQuery = "",
  autoFocus = false,
  showButton = true,
  onSearch,
  onQueryChange,
  className = "",
}: HomeSearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultQuery);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  const submitSearch = useCallback(
    (rawQuery: string) => {
      const normalized = normalizeSearchQuery(rawQuery);

      if (onSearch) {
        onSearch(normalized);
        return;
      }

      if (!normalized) {
        router.push("/search");
        return;
      }

      router.push(`/search?q=${encodeURIComponent(normalized)}`);
    },
    [onSearch, router],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitSearch(query);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch(query);
    }
  }

  const isDesktop = variant === "desktop";

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 ${className}`}
    >
      <div
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-3 ${
          isDesktop ? "py-2.5" : "py-2"
        }`}
      >
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            onQueryChange?.(nextQuery);
          }}
          onKeyDown={handleKeyDown}
          placeholder={SEARCH_PLACEHOLDER}
          autoFocus={autoFocus}
          aria-label="搜索"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
        />
      </div>

      {showButton ? (
        <button
          type="submit"
          className={`shrink-0 rounded-full bg-rose-500 font-semibold text-white transition-colors hover:bg-rose-600 ${
            isDesktop ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-xs"
          }`}
        >
          搜索
        </button>
      ) : null}
    </form>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}
