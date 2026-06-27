import Link from "next/link";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import { fetchActiveChannels } from "@/lib/channels/queries";

export default async function ChannelsPage() {
  const channels = await fetchActiveChannels();

  const content = (
    <div className="bg-white">
      <div className="border-b border-zinc-100/40 px-4 py-5 lg:px-0">
        <h1 className="text-xl font-semibold text-zinc-900">全部频道</h1>
        <p className="mt-1 text-sm text-zinc-500">新闻、活动、公告与组织内容</p>
      </div>

      <div className="divide-y divide-zinc-100/40">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.slug}`}
            className="block px-4 py-5 hover:bg-zinc-50 lg:px-0"
          >
            <h2 className="text-base font-semibold text-zinc-900">{channel.name}</h2>
            {channel.description ? (
              <p className="mt-1 text-sm leading-6 text-zinc-500">{channel.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div className="relative mx-auto min-h-screen max-w-md bg-white pb-24 lg:hidden">
        <main>{content}</main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-white lg:block">
        <DesktopHomeSidebar />
        <div className="pl-[220px]">
          <div className="mx-auto min-h-screen max-w-2xl px-8 py-6">{content}</div>
        </div>
      </div>
    </>
  );
}
