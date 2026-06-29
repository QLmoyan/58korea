"use client";

import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ProfilePublicView from "@/components/profile/ProfilePublicView";

interface ProfilePublicContentProps {
  username: string;
}

export default function ProfilePublicContent({
  username,
}: ProfilePublicContentProps) {
  return (
    <>
      <div className="relative mx-auto min-h-screen w-full max-w-lg bg-zinc-50 pb-24 lg:hidden">
        <main>
          <ProfilePublicView username={username} layout="mobile" />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 lg:block">
        <DesktopHomeSidebar />
        <div className="pl-[220px]">
          <ProfilePublicView username={username} layout="desktop" />
        </div>
      </div>
    </>
  );
}
