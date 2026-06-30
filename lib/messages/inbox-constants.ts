import type { InboxDetailId } from "./inbox-types";

export const MESSAGE_INBOX_EMPTY = "还没有消息";

export const MESSAGE_CONTACTS_EMPTY = "暂无联系人";

export const INBOX_EMPTY_SUMMARIES: Record<InboxDetailId, string> = {
  system: "暂无系统通知",
  interaction: "暂无评论和回复",
  like: "暂无点赞",
};

export const INBOX_DETAIL_TITLES: Record<InboxDetailId, string> = {
  system: "系统通知",
  interaction: "评论和回复",
  like: "收到的赞",
};

export const INBOX_DETAIL_EMPTY: Record<InboxDetailId, string> = {
  system: "暂无系统通知",
  interaction: "暂无评论和回复",
  like: "暂无点赞通知",
};
