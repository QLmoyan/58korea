import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ArticleDetailView from "@/components/channels/ArticleDetailView";
import { fetchPublishedArticleById } from "@/lib/channels/queries";

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await fetchPublishedArticleById(id);

  if (!article) {
    notFound();
  }

  const content = (
    <div>
      <div className="border-b border-zinc-100/40 px-3 py-3 lg:px-0">
        <Link href={`/channels/${article.channel.slug}`} className="text-xs text-zinc-500">
          ← 返回 {article.channel.name}
        </Link>
      </div>
      <ArticleDetailView article={article} />
    </div>
  );

  return (
    <>
      <div className="relative mx-auto min-h-screen w-full max-w-md bg-white pb-24 lg:hidden">
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
