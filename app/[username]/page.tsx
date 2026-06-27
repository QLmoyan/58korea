import { redirect } from "next/navigation";
import { normalizeUsername } from "@/lib/auth/username";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";

interface LegacyUserHomePageProps {
  params: Promise<{ username: string }>;
}

export default async function LegacyUserHomeRedirectPage({
  params,
}: LegacyUserHomePageProps) {
  const { username } = await params;
  redirect(buildPublicProfileHref(normalizeUsername(username)));
}
