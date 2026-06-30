export interface ChatMessageItem {
  id: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  time: string;
  isMine: boolean;
}

export interface ChatConversationPeer {
  userId: string;
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
