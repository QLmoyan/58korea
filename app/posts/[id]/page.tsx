import type { Metadata } from "next";
import PostDetailContent from "@/components/posts/PostDetailContent";
import { SITE_NAME } from "@/lib/share/constants";
import {
  buildShareMetadata,
  truncateDescription,
} from "@/lib/share/metadata";
import { buildPostSharePath } from "@/lib/share/paths";
import { fetchPublishedPostForMetadata } from "@/lib/share/server-metadata";

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const postId = Number(id);

  if (!Number.isFinite(postId)) {
    return buildShareMetadata({
      title: `帖子 - ${SITE_NAME}`,
      description: `查看 ${SITE_NAME} 社区帖子`,
      path: `/posts/${id}`,
    });
  }

  try {
    const post = await fetchPublishedPostForMetadata(postId);

    if (!post) {
      return {
        title: `帖子不存在 - ${SITE_NAME}`,
      };
    }

    const description = truncateDescription(post.content?.trim() || post.title);

    return buildShareMetadata({
      title: `${post.title} - ${SITE_NAME}`,
      description,
      path: buildPostSharePath(postId),
    });
  } catch {
    return buildShareMetadata({
      title: `帖子 - ${SITE_NAME}`,
      description: `查看 ${SITE_NAME} 社区帖子`,
      path: buildPostSharePath(postId),
    });
  }
}

export default function PostDetailPage() {
  return <PostDetailContent />;
}
