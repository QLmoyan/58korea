export interface ChatMessageItem {
  id: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  time: string;
  isMine: boolean;
  status?: "sending" | "failed";
}

export interface ChatConversationPeer {
  userId: string;
  username: string | null;
  nickname: string;
  avatarUrl: string | null;
  avatarLabel: string;
}

export interface ChatInboxItem {
  conversationId: string;
  peerUserId: string;
  title: string;
  summary: string;
  time: string;
  sortAt: string;
  unreadCount: number;
  avatarLabel: string;
  avatarUrl: string | null;
}
