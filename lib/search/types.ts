import type { Post } from "@/lib/data/posts";

export type SearchTabId = "all" | "users" | "merchants";

export interface SearchUserResult {
  id: string;
  username: string;
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;
  profileHref: string;
}

export interface SearchMerchantResult {
  id: string;
  username: string;
  businessName: string;
  logoUrl: string | null;
  description: string | null;
  address: string | null;
  businessHours: string | null;
  profileHref: string;
}

export interface SearchState {
  query: string;
  postResults: Post[];
  userResults: SearchUserResult[];
  merchantResults: SearchMerchantResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}
