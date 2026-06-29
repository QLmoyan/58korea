import SquareBanner from "@/components/square/SquareBanner";
import ChannelModuleCard from "@/components/channels/ChannelModuleCard";
import type { SquareBannerItem } from "@/lib/square/banners";
import type { ChannelWithArticles } from "@/lib/types/channel-articles";

interface ChannelSquareContentProps {
  modules: ChannelWithArticles[];
  banners: SquareBannerItem[];
}

export default function ChannelSquareContent({
  modules,
  banners,
}: ChannelSquareContentProps) {
  return (
    <>
      <SquareBanner banners={banners} />
      <div className="mt-1 bg-white">
        {modules.length > 0 ? (
          modules.map((channel) => (
            <ChannelModuleCard key={channel.id} channel={channel} />
          ))
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">暂无频道内容</p>
          </div>
        )}
      </div>
    </>
  );
}
