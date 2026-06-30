"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { CLIENT_FETCH_TIMEOUT_MS, LOADING_UI_DEADLINE_MS } from "@/lib/constants/network";
import {
  fetchConversationMessagesAction,
  sendChatMessageAction,
} from "@/lib/actions/chat";
import type { ChatConversationPeer, ChatMessageItem } from "@/lib/chat/types";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { useAuthStore } from "@/lib/store/auth-store";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

interface ChatConversationPanelProps {
  conversationId: string;
  showBackButton?: boolean;
}

function ChatConversationPanel({
  conversationId,
  showBackButton = false,
}: ChatConversationPanelProps) {
  const { user, loading, initError, retryInit } = useAuthStore();
  const [peer, setPeer] = useState<ChatConversationPeer | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [fetching, setFetching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!user) {
      setPeer(null);
      setMessages([]);
      return;
    }

    setFetching(true);
    setError("");

    try {
      const data = await withTimeout(
        fetchConversationMessagesAction(conversationId),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载聊天超时，请检查网络后重试",
      );
      setPeer(data.peer);
      setMessages(data.messages);
    } catch (loadError) {
      logClientError("chat.load", loadError, { conversationId });
      setError(
        loadError instanceof Error ? loadError.message : "加载聊天失败",
      );
      setPeer(null);
      setMessages([]);
    } finally {
      setFetching(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const sent = await sendChatMessageAction(conversationId, body);
      setDraft("");
      setMessages((current) => [
        ...current,
        {
          id: sent.id,
          senderId: user!.id,
          body,
          isRead: true,
          createdAt: sent.createdAt,
          time: "刚刚",
          isMine: true,
        },
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "发送失败");
    } finally {
      setSending(false);
    }
  }

  const authLoadingOverdue = useLoadingDeadline(loading, LOADING_UI_DEADLINE_MS);
  const authError =
    initError ??
    (authLoadingOverdue ? "登录状态加载超时，请检查网络后重试" : null);
  const waitingForAuth = loading && !authError;
  const waitingForInitialData =
    Boolean(user) && fetching && messages.length === 0 && !error;
  const dataLoadingOverdue = useLoadingDeadline(
    waitingForInitialData,
    CLIENT_FETCH_TIMEOUT_MS + 3_000,
  );
  const dataError =
    error ??
    (dataLoadingOverdue ? "加载聊天超时，请检查网络后重试" : null);

  return (
    <div className="flex min-h-screen w-full flex-col bg-zinc-50 lg:min-h-[70vh] lg:rounded-2xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <div className="border-b border-zinc-100 bg-white px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Link
              href="/messages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
              aria-label="返回消息"
            >
              <BackIcon />
            </Link>
          ) : (
            <Link
              href="/messages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
              aria-label="返回消息"
            >
              <BackIcon />
            </Link>
          )}

          {peer?.avatarUrl ? (
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-100">
              <Image
                src={peer.avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-300 text-sm font-bold text-white">
              {peer?.avatarLabel.slice(0, 2) ?? "用"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-zinc-900">
              {peer?.nickname ?? "私信"}
            </h1>
          </div>
        </div>
      </div>

      {waitingForAuth ? (
        <AsyncStatePanel message="加载中..." />
      ) : authError && !user ? (
        <AsyncStatePanel message={authError} tone="error" onRetry={retryInit} />
      ) : dataError ? (
        <AsyncStatePanel
          message={dataError}
          tone="error"
          onRetry={() => void loadMessages()}
        />
      ) : waitingForInitialData ? (
        <AsyncStatePanel message="加载中..." />
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[40vh] items-center justify-center">
                <p className="text-sm text-zinc-400">还没有消息，打个招呼吧</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div
            className={`border-t border-zinc-100 bg-white px-4 py-3 lg:px-6 ${
              showBackButton ? "pb-chat-composer" : "pb-safe"
            }`}
          >
            {error && messages.length > 0 ? (
              <p className="mb-2 text-xs text-rose-500">{error}</p>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={1}
                placeholder="输入消息..."
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-rose-200"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {sending ? "发送中" : "发送"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatConversationContent({
  conversationId,
}: {
  conversationId: string;
}) {
  return (
    <>
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-zinc-50 pb-24 lg:hidden">
        <main className="w-full flex-1">
          <ChatConversationPanel conversationId={conversationId} showBackButton />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 pl-[220px] pr-[280px] lg:block">
        <DesktopHomeSidebar />
        <DesktopHomeAside />
        <main className="mx-auto w-full max-w-[920px] px-6 py-6">
          <ChatConversationPanel conversationId={conversationId} />
        </main>
      </div>
    </>
  );
}

function BackIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
