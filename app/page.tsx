"use client";

import BottomNav from "@/components/home/BottomNav";
import DesktopHomeShell from "@/components/home/DesktopHomeShell";
import HomeFeed from "@/components/home/HomeFeed";
import { HomeSearchContextProvider } from "@/lib/search/home-search-context";

export default function Home() {
  return (
    <HomeSearchContextProvider>
      <div className="relative mx-auto min-h-screen w-full max-w-md bg-zinc-50 pb-24 lg:hidden">
        <main className="relative z-0">
          <HomeFeed />
        </main>
        <BottomNav />
      </div>

      <div className="hidden lg:block">
        <DesktopHomeShell />
      </div>
    </HomeSearchContextProvider>
  );
}
