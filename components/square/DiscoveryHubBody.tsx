"use client";

import { useState } from "react";
import DiscoveryCategoryTabs from "@/components/square/DiscoveryCategoryTabs";
import SquareBanner from "@/components/square/SquareBanner";
import SquareRecommendedFeed from "@/components/square/SquareRecommendedFeed";
import type { DiscoveryNewsArticleItem } from "@/lib/types/channel-articles";
import type { SquareBannerItem } from "@/lib/square/banners";
import {
  DEFAULT_DISCOVERY_CATEGORY_TAB,
  type DiscoveryCategoryTabId,
} from "@/lib/square/discovery-category-tabs";

interface DiscoveryHubBodyProps {
  banners: SquareBannerItem[];
  newsArticles: DiscoveryNewsArticleItem[];
}

export default function DiscoveryHubBody({
  banners,
  newsArticles,
}: DiscoveryHubBodyProps) {
  const [categoryTab, setCategoryTab] = useState<DiscoveryCategoryTabId>(
    DEFAULT_DISCOVERY_CATEGORY_TAB,
  );

  return (
    <>
      <SquareBanner banners={banners} />
      <DiscoveryCategoryTabs value={categoryTab} onChange={setCategoryTab} />
      <SquareRecommendedFeed categoryTab={categoryTab} newsArticles={newsArticles} />
    </>
  );
}
