import type { Post } from "@/lib/data/posts";

export type SearchTabId = "all" | "users" | "merchants";

export interface SearchState {
  query: string;
  results: Post[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}
