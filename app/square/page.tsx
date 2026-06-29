import type { Metadata } from "next";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ChannelSquareContent from "@/components/channels/ChannelSquareContent";
import { fetchSquareChannelModules } from "@/lib/channels/queries";
import { SITE_NAME } from "@/lib/share/constants";

export const metadata: Metadata = {
  title: `发现 - ${SITE_NAME}`,
};

export default async function SquarePage() {
  const modules = await fetchSquareChannelModules();

  return (
    <>
      <div className="relative mx-auto min-h-screen w-full max-w-md bg-white pb-24 lg:hidden">
        <main>
          <ChannelSquareContent modules={modules} />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-white lg:block">
        <DesktopHomeSidebar />
        <div className="pl-[220px]">
          <div className="mx-auto min-h-screen max-w-2xl px-8 py-6">
            <ChannelSquareContent modules={modules} />
          </div>
        </div>
      </div>
    </>
  );
}
