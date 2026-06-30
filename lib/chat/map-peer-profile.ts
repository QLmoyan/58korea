import type { ChatConversationPeer } from "@/lib/chat/types";

export interface ChatPeerProfileRow {
  id: string;
  nickname: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface ChatPeerMerchantRow {
  user_id: string;
  business_name: string | null;
  logo_url: string | null;
}

export function resolveChatAvatarUrl(
  avatarUrl: string | null | undefined,
  merchantLogoUrl: string | null | undefined,
): string | null {
  const profileAvatar = avatarUrl?.trim();
  if (profileAvatar) {
    return profileAvatar;
  }

  const merchantLogo = merchantLogoUrl?.trim();
  if (merchantLogo) {
    return merchantLogo;
  }

  return null;
}

export function mapChatPeerProfile(
  profile: ChatPeerProfileRow | null | undefined,
  merchant: ChatPeerMerchantRow | null | undefined,
  userId: string,
): ChatConversationPeer {
  const nickname =
    profile?.nickname?.trim() ||
    merchant?.business_name?.trim() ||
    profile?.username?.trim() ||
    "用户";

  return {
    userId,
    username: profile?.username?.trim() || null,
    nickname,
    avatarUrl: resolveChatAvatarUrl(profile?.avatar_url, merchant?.logo_url),
    avatarLabel: nickname.slice(0, 2) || "用户",
  };
}
