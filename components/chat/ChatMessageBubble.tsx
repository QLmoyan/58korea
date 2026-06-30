"use client";

import type { ChatMessageItem } from "@/lib/chat/types";

interface ChatMessageBubbleProps {
  message: ChatMessageItem;
}

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  return (
    <div
      className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
      data-chat-message-id={message.id}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
          message.isMine
            ? "rounded-br-md bg-gradient-to-r from-rose-500 to-orange-400 text-white"
            : "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-100"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <time
          className={`mt-1 block text-[10px] ${
            message.isMine ? "text-white/80" : "text-zinc-400"
          }`}
        >
          {message.time}
        </time>
      </div>
    </div>
  );
}
