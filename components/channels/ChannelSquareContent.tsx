import SquareBanner from "@/components/square/SquareBanner";
import ChannelModuleCard from "@/components/channels/ChannelModuleCard";
import { SQUARE_BANNERS } from "@/lib/square/banners";
import type { ChannelWithArticles } from "@/lib/types/channel-articles";

interface ChannelSquareContentProps {
  modules: ChannelWithArticles[];
}

export default function ChannelSquareContent({ modules }: ChannelSquareContentProps) {
  return (
    <>
      <SquareBanner banners={SQUARE_BANNERS} />
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
