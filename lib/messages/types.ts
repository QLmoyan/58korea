export type MessageTabId = "comment" | "reply" | "like" | "system";

export interface MessageItem {
  id: string;
  tab: MessageTabId;
  title: string;
  content: string;
  time: string;
  avatarLabel: string;
  postId: number;
  isRead: boolean;
  thumbnailUrl?: string | null;
}
