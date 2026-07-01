import type { Metadata } from "next";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import DiscoveryHubContent from "@/components/square/DiscoveryHubContent";
import { fetchPublishedDiscoveryNewsArticles } from "@/lib/channels/queries";
import { fetchActiveSquareBanners } from "@/lib/square/queries";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `发现 - ${SITE_NAME}`,
};

export default async function SquarePage() {
  const [banners, newsArticles] = await Promise.all([
    fetchActiveSquareBanners(),
    fetchPublishedDiscoveryNewsArticles(),
  ]);

  return (
    <>
      <div className="relative mx-auto min-h-screen w-full max-w-md bg-zinc-50 pb-24 lg:hidden">
        <main>
          <DiscoveryHubContent banners={banners} newsArticles={newsArticles} />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 lg:block">
        <DesktopHomeSidebar />
        <div className="pl-[220px]">
          <div className="mx-auto min-h-screen max-w-2xl px-8 py-6">
            <DiscoveryHubContent banners={banners} newsArticles={newsArticles} />
          </div>
        </div>
      </div>
    </>
  );
}
