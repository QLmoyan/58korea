export interface AdminDashboardStats {
  generatedAt: string;
  timezone: "Asia/Seoul";
  users: {
    total: number;
    newToday: number;
    dau: number;
    wau: number;
    mau: number;
  };
  content: {
    postsToday: number;
    commentsToday: number;
    /** null when search logging is not implemented */
    searchesToday: number | null;
  };
  merchants: {
    total: number;
    certified: number;
    activeToday: number;
  };
  coupons: {
    publishedToday: number;
    claimedToday: number;
    redeemedToday: number;
  };
  operations: {
    pendingReviewPosts: number;
    pendingReports: number;
  };
}
