import type { Metadata } from "next";
import SearchPageContent from "@/components/search/SearchPageContent";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `搜索 - ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function SearchPage() {
  return <SearchPageContent />;
}
