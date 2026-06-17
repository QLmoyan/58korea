import type { FeedChannel } from "@/lib/data/posts";
import { channels } from "@/lib/data/posts";

interface ChannelTabsProps {
  active: FeedChannel;
  onChange: (channel: FeedChannel) => void;
}

export default function ChannelTabs({ active, onChange }: ChannelTabsProps) {
  return (
    <div className="border-b border-zinc-100 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-6">
        {channels.map((channel) => {
          const isActive = active === channel;

          return (
            <button
              key={channel}
              type="button"
              onClick={() => onChange(channel)}
              className="relative flex flex-col items-center px-2 py-3"
            >
              <span
                className={`text-[15px] transition-colors ${
                  isActive
                    ? "font-bold text-zinc-900"
                    : "font-medium text-zinc-400"
                }`}
              >
                {channel}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-rose-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
