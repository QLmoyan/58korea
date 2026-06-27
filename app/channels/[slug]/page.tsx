import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ChannelArticleListItem from "@/components/channels/ChannelArticleListItem";
import { fetchPublishedArticlesByChannelSlug } from "@/lib/channels/queries";

interface ChannelPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug } = await params;
  const result = await fetchPublishedArticlesByChannelSlug(slug);

  if (!result) {
    notFound();
  }

  const { channel, articles } = result;

  const content = (
    <div className="bg-white">
      <div className="border-b border-zinc-100/40 px-4 py-5 lg:px-0">
        <Link href="/square" className="text-xs font-medium text-rose-500">
          返回广场
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">{channel.name}</h1>
        {channel.description ? (
          <p className="mt-2 text-sm leading-6 text-zinc-500">{channel.description}</p>
        ) : null}
      </div>

      <div className="px-4 lg:px-0">
        {articles.length > 0 ? (
          articles.map((article) => (
            <ChannelArticleListItem key={article.id} article={article} />
          ))
        ) : (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-zinc-400">该频道暂无文章</p>
          </div>
        )}
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
