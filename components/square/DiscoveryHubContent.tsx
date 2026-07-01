import DiscoveryHubBody from "@/components/square/DiscoveryHubBody";
import type { DiscoveryNewsArticleItem } from "@/lib/types/channel-articles";
import type { SquareBannerItem } from "@/lib/square/banners";

interface DiscoveryHubContentProps {
  banners: SquareBannerItem[];
  newsArticles: DiscoveryNewsArticleItem[];
}

export default function DiscoveryHubContent({
  banners,
  newsArticles,
}: DiscoveryHubContentProps) {
  return <DiscoveryHubBody banners={banners} newsArticles={newsArticles} />;
}
