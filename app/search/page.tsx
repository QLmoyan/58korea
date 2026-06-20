import type { Metadata } from "next";
import SearchPageContent from "@/components/search/SearchPageContent";

export const metadata: Metadata = {
  title: "搜索 - 58韩国",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SearchPage() {
  return <SearchPageContent />;
}
