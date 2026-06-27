import { redirect } from "next/navigation";
import { normalizeUsername } from "@/lib/auth/username";
import { buildPublicProfileHref } from "@/lib/merchant/user-home";

interface MerchantPageProps {
  params: Promise<{ username: string }>;
}

export default async function MerchantRedirectPage({ params }: MerchantPageProps) {
  const { username } = await params;
  redirect(buildPublicProfileHref(normalizeUsername(username)));
}
