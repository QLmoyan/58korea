export type InboxDetailId = "system" | "interaction" | "like";

export type MessageCenterView = "inbox" | "contacts" | InboxDetailId;

export interface InboxConversationItem {
  id: InboxDetailId;
  title: string;
  summary: string;
  time: string;
  unreadCount: number;
  avatarLabel: string;
  avatarUrl: string | null;
  avatarKind: "system" | "user";
}
