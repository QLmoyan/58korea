"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfileHistoryFeed from "@/components/profile/ProfileHistoryFeed";
import ProfileFavoriteFeed from "@/components/profile/ProfileFavoriteFeed";
import ProfilePostFeed from "@/components/profile/ProfilePostFeed";
import ProfileCommentsList from "@/components/profile/ProfileCommentsList";
import ProfileCouponsList from "@/components/profile/ProfileCouponsList";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileStats from "@/components/profile/ProfileStats";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { FEED_UI_DEADLINE_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { usePostStore } from "@/lib/store/post-store";
import { useProfileData } from "@/components/profile/useProfileData";

interface ProfileLoggedInViewProps {
  layout: "mobile" | "desktop";
  onSignOut: () => Promise<void>;
  signingOut: boolean;
  signOutError: string;
}

export default function ProfileLoggedInView({
  layout,
  onSignOut,
  signingOut,
  signOutError,
}: ProfileLoggedInViewProps) {
  const router = useRouter();
  const { refreshFavoritePosts } = usePostStore();
  const {
    displayName,
    displayBio,
    isMerchant,
    merchantDetails,
    merchantDetailsLoading,
    myPosts,
    myComments,
    totalLikes,
    favoritePosts,
    favoriteCount,
    historyPosts,
    user,
    hydrated,
    engagementHydrated,
    feedError,
    reloadFeed,
    avatarUrl,
  } = useProfileData();
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");

  useEffect(() => {
    if (activeTab !== "favorites" || !user?.id || !engagementHydrated) {
      return;
    }

    void refreshFavoritePosts();
  }, [activeTab, user?.id, engagementHydrated, refreshFavoritePosts]);

  const waitingForFeed = !hydrated;
  const waitingForEngagement =
    (activeTab === "favorites" || activeTab === "history") && !engagementHydrated;
  const tabNeedsFeed = activeTab === "posts" || activeTab === "comments";
  const tabNeedsEngagement =
    activeTab === "favorites" || activeTab === "history";
  const waitingForTabData =
    (tabNeedsFeed && waitingForFeed) ||
    (tabNeedsEngagement && waitingForEngagement);
  const feedLoadingOverdue = useLoadingDeadline(
    waitingForFeed,
    FEED_UI_DEADLINE_MS,
  );
  const feedErrorMessage =
    feedError ??
    (feedLoadingOverdue ? "内容加载超时，请检查网络后重试" : null);
  const tabFeedError =
    tabNeedsFeed || tabNeedsEngagement ? feedErrorMessage : null;

  function handleEditProfile() {
    router.push("/profile/edit");
  }

  async function handleSignOut() {
    await onSignOut();
  }

  function renderTabContent() {
    if (tabFeedError) {
      return (
        <AsyncStatePanel
          message={tabFeedError}
          tone="error"
          onRetry={reloadFeed}
        />
      );
    }

    if (waitingForTabData) {
      return <AsyncStatePanel message="加载中..." />;
    }

    switch (activeTab) {
      case "posts":
        return (
          <ProfilePostFeed
            posts={myPosts}
            emptyMessage="还没有发布帖子，去发布第一条吧"
          />
        );
      case "comments":
        return <ProfileCommentsList comments={myComments} />;
      case "favorites":
        return (
          <ProfileFavoriteFeed
            posts={favoritePosts}
            emptyMessage="还没有收藏帖子，去发现更多吧"
          />
        );
      case "history":
        return (
          <ProfileHistoryFeed
            entries={historyPosts}
            emptyMessage="你还没有浏览记录"
          />
        );
      case "coupons":
        return user ? <ProfileCouponsList userId={user.id} /> : null;
      default:
        return null;
    }
  }

  const header = (
    <ProfileHeader
      displayName={displayName}
      bio={displayBio}
      avatarLabel={displayName}
      avatarUrl={avatarUrl}
      isMerchant={isMerchant}
      merchantDetails={merchantDetails}
      merchantDetailsLoading={merchantDetailsLoading}
      onEditProfile={handleEditProfile}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      signOutError={signOutError}
      layout={layout}
    />
  );

  const stats = (
    <ProfileStats
      postCount={myPosts.length}
      likeCount={totalLikes}
      favoriteCount={favoriteCount}
      layout={layout}
    />
  );

  const tabsAndContent = (
    <div className="min-w-0 flex-1 lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
      <div className="pb-4">{renderTabContent()}</div>
    </div>
  );

  if (layout === "desktop") {
    return (
      <div className="mx-auto flex min-h-screen max-w-6xl gap-8 px-8 py-8">
        <aside className="w-80 shrink-0">
          {header}
          {stats}
        </aside>
        <main className="min-w-0 flex-1">{tabsAndContent}</main>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {header}
      {stats}
      {tabsAndContent}
    </div>
  );
}
