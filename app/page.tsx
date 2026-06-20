"use client";

import BottomNav from "@/components/home/BottomNav";
import DesktopHomeShell from "@/components/home/DesktopHomeShell";
import HomeFeed from "@/components/home/HomeFeed";
import HomeSearchBar from "@/components/home/HomeSearchBar";
import TopNav from "@/components/home/TopNav";

export default function Home() {
  return (
    <>
      <div className="relative mx-auto min-h-screen max-w-md bg-zinc-50 pb-24 lg:hidden">
        <TopNav />
        <div className="pt-14">
          <div className="sticky top-14 z-50 border-b border-zinc-100 bg-white/95 px-4 py-2 backdrop-blur-md">
            <HomeSearchBar variant="mobile" />
          </div>
          <main className="relative z-0">
            <HomeFeed />
          </main>
        </div>
        <BottomNav />
      </div>

      <div className="hidden lg:block">
        <DesktopHomeShell />
      </div>
    </>
  );
}
