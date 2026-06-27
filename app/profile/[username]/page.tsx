import type { Metadata } from "next";
import ProfilePublicContent from "@/components/profile/ProfilePublicContent";
import { normalizeUsername } from "@/lib/auth/username";
import { SITE_NAME } from "@/lib/share/constants";
import {
  buildShareMetadata,
  truncateDescription,
} from "@/lib/share/metadata";
import { buildProfileSharePath } from "@/lib/share/paths";
import { fetchPublicProfileForMetadata } from "@/lib/share/server-metadata";

interface ProfilePublicPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({
  params,
}: ProfilePublicPageProps): Promise<Metadata> {
  const { username } = await params;
  const normalized = normalizeUsername(username);

  try {
    const profile = await fetchPublicProfileForMetadata(normalized);

    if (!profile) {
      return {
        title: `用户不存在 - ${SITE_NAME}`,
      };
    }

    const title = profile.isMerchant
      ? `${profile.displayName} 的商家主页 - ${SITE_NAME}`
      : `${profile.displayName} 的主页 - ${SITE_NAME}`;

    return buildShareMetadata({
      title,
      description: truncateDescription(profile.description),
      path: buildProfileSharePath(normalized),
    });
  } catch {
    return buildShareMetadata({
      title: `用户主页 - ${SITE_NAME}`,
      description: "查看 58韩国 用户主页",
      path: buildProfileSharePath(normalized),
    });
  }
}

export default async function ProfilePublicPage({ params }: ProfilePublicPageProps) {
  const { username } = await params;

  return <ProfilePublicContent username={normalizeUsername(username)} />;
}
