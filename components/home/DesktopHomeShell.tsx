"use client";

import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import DesktopPostModalHost from "@/components/home/DesktopPostModalHost";
import HomeFeed from "@/components/home/HomeFeed";
import { DesktopPostModalProvider } from "@/lib/store/desktop-post-modal-store";

export default function DesktopHomeShell() {
  return (
    <DesktopPostModalProvider>
      <DesktopHomeSidebar />
      <DesktopHomeAside />
      <div className="min-h-screen pl-[220px] pr-[280px]">
        <main className="mx-auto w-full max-w-[920px] px-6 pt-3 pb-6">
          <HomeFeed />
        </main>
      </div>
      <DesktopPostModalHost />
    </DesktopPostModalProvider>
  );
}
