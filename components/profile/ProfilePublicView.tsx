"use client";

import { useEffect, useMemo, useState } from "react";
import ProfilePostFeed from "@/components/profile/ProfilePostFeed";
import MerchantCouponsSection from "@/components/merchant/MerchantCouponsSection";
import ProfilePublicHeader from "@/components/profile/ProfilePublicHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import type { Post } from "@/lib/data/posts";
import type { MerchantProfile } from "@/lib/types/merchant";
import type { Profile } from "@/lib/types/user";
import {
  fetchMerchantProfileByUsername,
  fetchPublishedPostsByAuthorId,
} from "@/lib/supabase/merchant-queries";
import { fetchPublicProfileByUsername } from "@/lib/supabase/profile";

interface ProfilePublicViewProps {
  username: string;
  layout: "mobile" | "desktop";
}

export default function ProfilePublicView({
  username,
  layout,
}: ProfilePublicViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchantDetails, setMerchantDetails] = useState<MerchantProfile | null>(
    null,
  );
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicProfile() {
      setLoading(true);
      setError("");
      setProfile(null);
      setMerchantDetails(null);
      setPosts([]);

      try {
        const [merchantProfile, publicProfile] = await Promise.all([
          fetchMerchantProfileByUsername(username),
          fetchPublicProfileByUsername(username),
        ]);

        if (!merchantProfile && !publicProfile) {
          if (!cancelled) {
            setError("用户主页不存在");
          }
          return;
        }

        const authorId = merchantProfile?.userId ?? publicProfile?.id;
        if (!authorId) {
          if (!cancelled) {
            setError("用户主页不存在");
          }
          return;
        }

        const publishedPosts = await fetchPublishedPostsByAuthorId(authorId);

        if (!cancelled) {
          setProfile(publicProfile);
          setMerchantDetails(merchantProfile);
          setPosts(publishedPosts);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "加载用户主页失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPublicProfile();

    return () => {
      cancelled = true;
    };
  }, [username]);

  const isMerchant = Boolean(merchantDetails);
  const displayName =
    merchantDetails?.businessName?.trim() ||
    profile?.nickname?.trim() ||
    username;
  const displayBio =
    merchantDetails?.description?.trim() || profile?.bio?.trim() || "";
  const avatarUrl = isMerchant
    ? merchantDetails?.logoUrl || profile?.avatarUrl
    : profile?.avatarUrl;
  const totalLikes = useMemo(
    () => posts.reduce((sum, post) => sum + post.likes, 0),
    [posts],
  );

  const authorId = merchantDetails?.userId ?? profile?.id ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-zinc-400">加载中...</p>
      </div>
    );
  }

  if (error || (!profile && !merchantDetails)) {
    return (
      <div className="px-4 py-24 text-center">
        <p className="text-sm text-zinc-500">{error || "用户主页不存在"}</p>
      </div>
    );
  }

  const header = (
    <ProfilePublicHeader
      username={username}
      displayName={displayName}
      bio={displayBio}
      avatarLabel={displayName}
      avatarUrl={avatarUrl}
      isMerchant={isMerchant}
      merchantDetails={merchantDetails}
      layout={layout}
      targetUserId={authorId}
    />
  );

  const stats = (
    <ProfileStats
      postCount={posts.length}
      likeCount={totalLikes}
      favoriteCount="—"
      layout={layout}
    />
  );

  const content = (
    <div className="min-w-0 flex-1 lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      {isMerchant && merchantDetails ? (
        <MerchantCouponsSection
          merchantId={merchantDetails.id}
          merchantOwnerUserId={merchantDetails.userId}
          allowManage={false}
          heading="当前有效优惠券"
        />
      ) : null}

      <section className="px-2 pt-3 pb-4">
        <h2 className="px-2 pb-2 text-sm font-semibold text-zinc-900 lg:px-4 lg:pt-4">
          {isMerchant ? "发布的帖子" : "帖子"}
        </h2>
        <ProfilePostFeed
          posts={posts}
          emptyMessage={
            isMerchant ? "该商家还没有发布帖子" : "该用户还没有发布帖子"
          }
        />
      </section>
    </div>
  );

  if (layout === "desktop") {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-8 py-8">
        <aside className="w-80 shrink-0">
          {header}
          {stats}
        </aside>
        <main className="min-w-0 flex-1">{content}</main>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {header}
      {stats}
      {content}
    </div>
  );
}
