"use client";

import BottomNav from "@/components/home/BottomNav";
import DesktopHomeShell from "@/components/home/DesktopHomeShell";
import HomeFeed from "@/components/home/HomeFeed";
import TopNav from "@/components/home/TopNav";

export default function Home() {
  return (
    <>
      <div className="relative mx-auto min-h-screen max-w-md bg-zinc-50 pb-24 lg:hidden">
        <TopNav />
        <main className="relative z-0 pt-14">
          <HomeFeed />
        </main>
        <BottomNav />
      </div>

      <div className="hidden lg:block">
        <DesktopHomeShell />
      </div>
    </>
  );
}
