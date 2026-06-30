export function normalizeChatParticipants(
  userA: string,
  userB: string,
): [string, string] {
  if (userA === userB) {
    throw new Error("不能与自己发起私信");
  }

  return userA < userB ? [userA, userB] : [userB, userA];
}

export function getChatPeerUserId(
  conversation: { participant_a: string; participant_b: string },
  currentUserId: string,
): string {
  if (conversation.participant_a === currentUserId) {
    return conversation.participant_b;
  }

  if (conversation.participant_b === currentUserId) {
    return conversation.participant_a;
  }

  throw new Error("无权访问该会话");
}
