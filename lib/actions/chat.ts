"use server";

import {
  getChatPeerUserId,
  normalizeChatParticipants,
} from "@/lib/chat/normalize-participants";
import {
  mapChatPeerProfile,
  type ChatPeerMerchantRow,
  type ChatPeerProfileRow,
} from "@/lib/chat/map-peer-profile";
import type {
  ChatConversationPeer,
  ChatInboxItem,
  ChatMessageItem,
} from "@/lib/chat/types";
import { formatRelativeMessageTime } from "@/lib/messages/format-time";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

const MAX_CHAT_BODY_LENGTH = 2000;

function trimChatBody(body: string) {
  return body.trim();
}

async function assertConversationParticipant(
  conversationId: string,
  userId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("会话不存在");
  }

  if (data.participant_a !== userId && data.participant_b !== userId) {
    throw new Error("无权访问该会话");
  }

  return data;
}

async function fetchPeerMerchant(
  peerUserId: string,
): Promise<ChatPeerMerchantRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchant_profiles")
    .select("user_id, business_name, logo_url")
    .eq("user_id", peerUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function fetchPeerMerchantsByUserIds(
  peerUserIds: string[],
): Promise<Map<string, ChatPeerMerchantRow>> {
  if (peerUserIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchant_profiles")
    .select("user_id, business_name, logo_url")
    .in("user_id", peerUserIds)
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.user_id, row]));
}

async function fetchPeerProfile(peerUserId: string): Promise<ChatConversationPeer> {
  const supabase = await createSupabaseServerClient();
  const [profileResult, merchant] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, username, avatar_url")
      .eq("id", peerUserId)
      .maybeSingle(),
    fetchPeerMerchant(peerUserId),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  return mapChatPeerProfile(
    profileResult.data as ChatPeerProfileRow | null,
    merchant,
    peerUserId,
  );
}

export async function fetchChatUnreadCountAction(): Promise<number> {
  const user = await getServerAuthUser();
  if (!user) {
    return 0;
  }

  const supabase = await createSupabaseServerClient();
  const { data: conversations, error: conversationsError } = await supabase
    .from("chat_conversations")
    .select("id")
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);

  if (conversationsError) {
    throw new Error(conversationsError.message);
  }

  const conversationIds = (conversations ?? []).map((row) => row.id);
  if (conversationIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getOrCreateConversationAction(targetUserId: string) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const trimmedTarget = targetUserId.trim();
  if (!trimmedTarget) {
    throw new Error("用户不存在");
  }

  if (trimmedTarget === user.id) {
    throw new Error("不能与自己发起私信");
  }

  const [participantA, participantB] = normalizeChatParticipants(
    user.id,
    trimmedTarget,
  );
  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("participant_a", participantA)
    .eq("participant_b", participantB)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return { conversationId: existing.id };
  }

  const { data: created, error: createError } = await supabase
    .from("chat_conversations")
    .insert({
      participant_a: participantA,
      participant_b: participantB,
    })
    .select("id")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("participant_a", participantA)
        .eq("participant_b", participantB)
        .maybeSingle();

      if (raceError) {
        throw new Error(raceError.message);
      }

      if (raced) {
        return { conversationId: raced.id };
      }
    }

    throw new Error(createError.message);
  }

  return { conversationId: created.id };
}

export async function sendChatMessageAction(
  conversationId: string,
  body: string,
) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const trimmedBody = trimChatBody(body);
  if (!trimmedBody) {
    throw new Error("消息不能为空");
  }

  if (trimmedBody.length > MAX_CHAT_BODY_LENGTH) {
    throw new Error(`消息不能超过 ${MAX_CHAT_BODY_LENGTH} 字`);
  }

  await assertConversationParticipant(conversationId, user.id);
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: message, error: messageError } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: trimmedBody,
      is_read: false,
    })
    .select("id, created_at")
    .single();

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: conversationError } = await supabase
    .from("chat_conversations")
    .update({
      last_message: trimmedBody,
      last_message_at: message.created_at ?? now,
      updated_at: now,
    })
    .eq("id", conversationId);

  if (conversationError) {
    throw new Error(conversationError.message);
  }

  return {
    id: message.id,
    createdAt: message.created_at ?? now,
  };
}

export async function fetchConversationMessagesAction(conversationId: string) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const conversation = await assertConversationParticipant(conversationId, user.id);
  const peerUserId = getChatPeerUserId(conversation, user.id);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, sender_id, body, is_read, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const unreadIds = (data ?? [])
    .filter((row) => row.sender_id !== user.id && !row.is_read)
    .map((row) => row.id);

  if (unreadIds.length > 0) {
    const { error: readError } = await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("id", unreadIds)
      .eq("conversation_id", conversationId);

    if (readError) {
      throw new Error(readError.message);
    }
  }

  const peer = await fetchPeerProfile(peerUserId);
  const messages: ChatMessageItem[] = (data ?? []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    isRead: row.sender_id === user.id ? row.is_read : true,
    createdAt: row.created_at,
    time: formatRelativeMessageTime(row.created_at),
    isMine: row.sender_id === user.id,
  }));

  return {
    conversationId,
    peer,
    messages,
  };
}

export async function fetchChatInboxAction(): Promise<ChatInboxItem[]> {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const supabase = await createSupabaseServerClient();
  const { data: conversations, error } = await supabase
    .from("chat_conversations")
    .select(
      "id, participant_a, participant_b, last_message, last_message_at, updated_at, created_at",
    )
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = conversations ?? [];
  if (rows.length === 0) {
    return [];
  }

  const peerIds = Array.from(
    new Set(
      rows.map((row) => getChatPeerUserId(row, user.id)),
    ),
  );

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, nickname, username, avatar_url")
    .in("id", peerIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile as ChatPeerProfileRow]),
  );
  const merchantByUserId = await fetchPeerMerchantsByUserIds(peerIds);

  const conversationIds = rows.map((row) => row.id);
  const { data: unreadRows, error: unreadError } = await supabase
    .from("chat_messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .eq("is_read", false)
    .neq("sender_id", user.id);

  if (unreadError) {
    throw new Error(unreadError.message);
  }

  const unreadByConversation = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadByConversation.set(
      row.conversation_id,
      (unreadByConversation.get(row.conversation_id) ?? 0) + 1,
    );
  }

  return rows
    .map((row) => {
      const peerUserId = getChatPeerUserId(row, user.id);
      const profile = profileById.get(peerUserId);
      const merchant = merchantByUserId.get(peerUserId);
      const peer = mapChatPeerProfile(profile, merchant, peerUserId);
      const sortAt = row.last_message_at ?? row.created_at;

      return {
        conversationId: row.id,
        peerUserId,
        title: peer.nickname,
        summary: row.last_message?.trim() || "暂无消息",
        time: sortAt ? formatRelativeMessageTime(sortAt) : "",
        sortAt,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
        avatarLabel: peer.avatarLabel,
        avatarUrl: peer.avatarUrl,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime(),
    );
}

export async function fetchChatConversationPeerAction(conversationId: string) {
  const user = await getServerAuthUser();
  if (!user) {
    throw new Error("请先登录");
  }

  const conversation = await assertConversationParticipant(conversationId, user.id);
  const peerUserId = getChatPeerUserId(conversation, user.id);
  return fetchPeerProfile(peerUserId);
}
