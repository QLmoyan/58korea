import BottomNav from "@/components/home/BottomNav";
import TopNav from "@/components/home/TopNav";

export default function ProfilePage() {
  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-zinc-50 pb-24">
      <TopNav />
      <main className="flex min-h-[60vh] items-center justify-center pt-14">
        <p className="text-sm text-zinc-500">我的页面开发中</p>
      </main>
      <BottomNav />
    </div>
  );
}
