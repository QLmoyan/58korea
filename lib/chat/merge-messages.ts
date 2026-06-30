import type { ChatMessageItem } from "@/lib/chat/types";

export const OPTIMISTIC_CHAT_MESSAGE_PREFIX = "optimistic:";

export function isOptimisticChatMessageId(id: string) {
  return id.startsWith(OPTIMISTIC_CHAT_MESSAGE_PREFIX);
}

export function mergeChatMessages(
  current: ChatMessageItem[],
  serverMessages: ChatMessageItem[],
): ChatMessageItem[] {
  const optimistic = current.filter((message) =>
    isOptimisticChatMessageId(message.id),
  );
  const pendingOptimistic = optimistic.filter((message) => {
    if (message.status === "failed") {
      return true;
    }

    return !serverMessages.some(
      (serverMessage) =>
        serverMessage.isMine === message.isMine &&
        serverMessage.body === message.body,
    );
  });

  const merged = [...serverMessages, ...pendingOptimistic];
  merged.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return merged.filter((message, index, list) => {
    if (!isOptimisticChatMessageId(message.id)) {
      return true;
    }

    const duplicateServer = list.some(
      (other) =>
        other.id !== message.id &&
        !isOptimisticChatMessageId(other.id) &&
        other.isMine === message.isMine &&
        other.body === message.body &&
        Math.abs(
          new Date(other.createdAt).getTime() -
            new Date(message.createdAt).getTime(),
        ) < 60_000,
    );

    return !duplicateServer || message.status === "failed";
  });
}
