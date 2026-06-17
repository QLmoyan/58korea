import BottomNav from "@/components/home/BottomNav";
import HomeFeed from "@/components/home/HomeFeed";
import TopNav from "@/components/home/TopNav";

export default function Home() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-zinc-50 pb-20">
      <TopNav />
      <main className="pt-14">
        <HomeFeed />
      </main>
      <BottomNav />
    </div>
  );
}
