export interface NotificationUnreadCounts {
  totalUnread: number;
  commentUnread: number;
  replyUnread: number;
  likeUnread: number;
  systemUnread: number;
}

export const EMPTY_NOTIFICATION_UNREAD_COUNTS: NotificationUnreadCounts = {
  totalUnread: 0,
  commentUnread: 0,
  replyUnread: 0,
  likeUnread: 0,
  systemUnread: 0,
};

export function buildNotificationUnreadCounts(
  rows: Array<{ type: string }>,
): NotificationUnreadCounts {
  let commentUnread = 0;
  let replyUnread = 0;
  let likeUnread = 0;
  let systemUnread = 0;

  for (const row of rows) {
    switch (row.type) {
      case "comment":
        commentUnread += 1;
        break;
      case "reply":
        replyUnread += 1;
        break;
      case "like":
        likeUnread += 1;
        break;
      case "system":
        systemUnread += 1;
        break;
      default:
        break;
    }
  }

  return {
    commentUnread,
    replyUnread,
    likeUnread,
    systemUnread,
    totalUnread: commentUnread + replyUnread + likeUnread + systemUnread,
  };
}

export function getUnreadCountForTab(
  counts: NotificationUnreadCounts,
  tab: "comment" | "reply" | "like" | "system",
) {
  switch (tab) {
    case "comment":
      return counts.commentUnread;
    case "reply":
      return counts.replyUnread;
    case "like":
      return counts.likeUnread;
    case "system":
      return counts.systemUnread;
    default:
      return 0;
  }
}

export function getUnreadCountForInboxDetail(
  counts: NotificationUnreadCounts,
  detailId: "system" | "interaction" | "like",
) {
  switch (detailId) {
    case "system":
      return counts.systemUnread;
    case "interaction":
      return counts.commentUnread + counts.replyUnread;
    case "like":
      return counts.likeUnread;
    default:
      return 0;
  }
}
