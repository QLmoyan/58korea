"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import InlineRefreshBar from "@/components/ui/InlineRefreshBar";
import { CLIENT_FETCH_TIMEOUT_MS, LOADING_UI_DEADLINE_MS } from "@/lib/constants/network";
import {
  fetchChatConversationPeerAction,
  fetchConversationMessagesAction,
  sendChatMessageAction,
} from "@/lib/actions/chat";
import {
  mergeChatMessages,
  OPTIMISTIC_CHAT_MESSAGE_PREFIX,
} from "@/lib/chat/merge-messages";
import { CHAT_DETAIL_POLL_MS } from "@/lib/chat/polling";
import type { ChatConversationPeer, ChatMessageItem } from "@/lib/chat/types";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { useVisibilityPolling } from "@/lib/hooks/use-visibility-polling";
import { dispatchNotificationUnreadRefresh } from "@/lib/messages/unread-events";
import { useAuthStore } from "@/lib/store/auth-store";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

interface ChatConversationPanelProps {
  conversationId: string;
  showBackButton?: boolean;
}

interface ChatEntryPeerHint {
  nickname: string;
  avatarUrl: string | null;
  avatarLabel: string;
}

function peerHintFromSearchParams(
  searchParams: URLSearchParams,
): ChatEntryPeerHint | null {
  const nickname = searchParams.get("peer")?.trim();
  if (!nickname) {
    return null;
  }

  return {
    nickname,
    avatarUrl: searchParams.get("avatar"),
    avatarLabel: searchParams.get("label")?.trim() || nickname.slice(0, 2),
  };
}

function hintToPeer(hint: ChatEntryPeerHint): ChatConversationPeer {
  return {
    userId: "",
    username: null,
    nickname: hint.nickname,
    avatarUrl: hint.avatarUrl,
    avatarLabel: hint.avatarLabel,
  };
}

function mergePeerFromServer(
  current: ChatConversationPeer | null,
  server: ChatConversationPeer,
): ChatConversationPeer {
  return {
    userId: server.userId,
    username: server.username,
    nickname: server.nickname || current?.nickname || "私信",
    avatarUrl: server.avatarUrl ?? current?.avatarUrl ?? null,
    avatarLabel: server.avatarLabel || current?.avatarLabel || "用",
  };
}

function createOptimisticId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${OPTIMISTIC_CHAT_MESSAGE_PREFIX}${crypto.randomUUID()}`;
  }

  return `${OPTIMISTIC_CHAT_MESSAGE_PREFIX}${Date.now()}`;
}

function isNearBottom(element: HTMLDivElement | null) {
  if (!element) {
    return true;
  }

  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

function ChatMessageListSkeleton() {
  return (
    <div className="space-y-4 py-2" data-testid="chat-message-skeleton">
      <div className="flex justify-start">
        <div className="h-10 w-40 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-52 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
      <div className="flex justify-start">
        <div className="h-10 w-36 animate-pulse rounded-2xl bg-zinc-200" />
      </div>
    </div>
  );
}

function ChatConversationPanel({
  conversationId,
  showBackButton = false,
}: ChatConversationPanelProps) {
  const searchParams = useSearchParams();
  const peerHint = useMemo(
    () => peerHintFromSearchParams(searchParams),
    [searchParams],
  );
  const { user, loading, initError, retryInit } = useAuthStore();
  const [peer, setPeer] = useState<ChatConversationPeer | null>(() =>
    peerHint ? hintToPeer(peerHint) : null,
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const sendingRef = useRef(false);
  const isComposingRef = useRef(false);
  const draftRef = useRef("");
  const messagesRef = useRef<ChatMessageItem[]>([]);
  messagesRef.current = messages;
  draftRef.current = draft;

  useEffect(() => {
    if (peerHint) {
      setPeer((current) => current ?? hintToPeer(peerHint));
    }
  }, [peerHint]);

  useEffect(() => {
    setMessages([]);
    setMessagesLoading(Boolean(user));
    setPeer(peerHint ? hintToPeer(peerHint) : null);
  }, [conversationId, peerHint, user]);

  const loadPeerHeader = useCallback(async () => {
    if (!user || !conversationId) {
      return;
    }

    try {
      const serverPeer = await fetchChatConversationPeerAction(conversationId);
      setPeer((current) => mergePeerFromServer(current, serverPeer));
    } catch (peerError) {
      logClientError("chat.peer", peerError, { conversationId });
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadPeerHeader();
  }, [conversationId, user, loadPeerHeader]);

  const syncDraftFromTextarea = useCallback(() => {
    const value = textareaRef.current?.value ?? "";
    draftRef.current = value;
    setDraft(value);
  }, []);

  const readDraftBody = useCallback(() => {
    const fromDom = textareaRef.current?.value ?? "";
    const fromState = draftRef.current;
    return (fromDom || fromState).trim();
  }, []);

  const loadMessages = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setPeer(peerHint ? hintToPeer(peerHint) : null);
        setMessages([]);
        setMessagesLoading(false);
        return;
      }

      const silent = options?.silent ?? messagesRef.current.length > 0;
      if (silent) {
        setRefreshing(true);
      } else if (messagesRef.current.length === 0) {
        setMessagesLoading(true);
      }
      setError("");

      try {
        const data = await withTimeout(
          fetchConversationMessagesAction(conversationId),
          CLIENT_FETCH_TIMEOUT_MS,
          "加载聊天超时，请检查网络后重试",
        );
        setPeer((current) => mergePeerFromServer(current, data.peer));
        setMessages((current) => mergeChatMessages(current, data.messages));
        dispatchNotificationUnreadRefresh();
      } catch (loadError) {
        logClientError("chat.load", loadError, { conversationId });
        if (!silent) {
          setError(
            loadError instanceof Error ? loadError.message : "加载聊天失败",
          );
          if (messagesRef.current.length === 0) {
            setMessages([]);
          }
        }
      } finally {
        setMessagesLoading(false);
        setRefreshing(false);
      }
    },
    [conversationId, peerHint, user],
  );

  useEffect(() => {
    if (!user) {
      setMessagesLoading(false);
      return;
    }

    void loadMessages({ silent: false });
  }, [conversationId, user, loadMessages]);

  useVisibilityPolling(
    CHAT_DETAIL_POLL_MS,
    Boolean(user),
    () => {
      void loadMessages({ silent: true });
    },
  );

  useEffect(() => {
    if (!shouldStickToBottomRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleScroll() {
    shouldStickToBottomRef.current = isNearBottom(scrollRef.current);
  }

  async function executeSend(body: string) {
    if (!user || !conversationId || sendingRef.current) {
      return;
    }

    const optimisticId = createOptimisticId();
    const optimisticMessage: ChatMessageItem = {
      id: optimisticId,
      senderId: user.id,
      body,
      isRead: true,
      createdAt: new Date().toISOString(),
      time: "刚刚",
      isMine: true,
      status: "sending",
    };

    sendingRef.current = true;
    setSending(true);
    setError("");
    draftRef.current = "";
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
    shouldStickToBottomRef.current = true;
    setMessages((current) => [...current, optimisticMessage]);

    try {
      const sent = await sendChatMessageAction(conversationId, body);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? {
                ...message,
                id: sent.id,
                createdAt: sent.createdAt,
                status: undefined,
              }
            : message,
        ),
      );
      dispatchNotificationUnreadRefresh();
      textareaRef.current?.blur();
    } catch (sendError) {
      logClientError("chat.send", sendError, { conversationId });
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, status: "failed" as const }
            : message,
        ),
      );
      draftRef.current = body;
      setDraft(body);
      if (textareaRef.current) {
        textareaRef.current.value = body;
      }
      setError(sendError instanceof Error ? sendError.message : "发送失败");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function safeHandleSend(event?: SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();

    if (isComposingRef.current) {
      return;
    }

    syncDraftFromTextarea();

    const body = readDraftBody();
    if (!body) {
      setError("请输入消息");
      return;
    }

    if (sendingRef.current || !user || !conversationId) {
      return;
    }

    void executeSend(body);
  }

  const authLoadingOverdue = useLoadingDeadline(loading, LOADING_UI_DEADLINE_MS);
  const authError =
    initError ??
    (authLoadingOverdue ? "登录状态加载超时，请检查网络后重试" : null);
  const waitingForAuth = loading && !authError;
  const showMessageSkeleton =
    Boolean(user) && messagesLoading && messages.length === 0 && !error;
  const showMessagesError =
    Boolean(user) && Boolean(error) && messages.length === 0 && !messagesLoading;
  const canCompose = Boolean(user) && !waitingForAuth && !(authError && !user);
  const sendDisabled = sending || !conversationId;
  const sendLooksEmpty = !draft.trim();

  return (
    <div className="flex h-dvh w-full flex-col bg-zinc-50 lg:h-auto lg:min-h-[70vh] lg:rounded-2xl lg:bg-white lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <InlineRefreshBar active={refreshing} />
      <div className="shrink-0 border-b border-zinc-100 bg-white px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Link
              href="/messages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
              aria-label="返回消息"
            >
              <BackIcon />
            </Link>
          ) : null}

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
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-28 lg:px-6 lg:pb-4"
          >
            {showMessageSkeleton ? (
              <ChatMessageListSkeleton />
            ) : showMessagesError ? (
              <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-rose-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadMessages({ silent: false })}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  重试
                </button>
              </div>
            ) : messages.length === 0 ? (
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

          {canCompose ? (
            <div
              className={`pointer-events-auto fixed right-0 bottom-0 left-0 z-[60] shrink-0 border-t border-zinc-100 bg-white px-4 py-3 pb-safe lg:static lg:z-50 lg:px-6 ${
                showBackButton ? "mx-auto max-w-md" : ""
              }`}
              data-testid="chat-composer"
            >
              {error ? (
                <p
                  className="mb-2 text-xs text-rose-500"
                  role="alert"
                  data-testid="chat-send-error"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => {
                    draftRef.current = event.target.value;
                    setDraft(event.target.value);
                  }}
                  onInput={syncDraftFromTextarea}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(event) => {
                    isComposingRef.current = false;
                    draftRef.current = event.currentTarget.value;
                    setDraft(event.currentTarget.value);
                  }}
                  rows={1}
                  placeholder="输入消息..."
                  enterKeyHint="send"
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-rose-200"
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !isComposingRef.current
                    ) {
                      event.preventDefault();
                      safeHandleSend();
                    }
                  }}
                />
                <button
                  type="button"
                  onPointerUp={(event) => safeHandleSend(event)}
                  onTouchEnd={(event) => safeHandleSend(event)}
                  onClick={(event) => safeHandleSend(event)}
                  disabled={sendDisabled}
                  aria-disabled={sendDisabled || sendLooksEmpty}
                  data-testid="chat-send-button"
                  className={`relative z-[1] inline-flex h-11 min-w-[4.5rem] shrink-0 touch-manipulation items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 ${
                    sendLooksEmpty && !sendDisabled ? "opacity-70" : ""
                  }`}
                >
                  {sending ? "发送中" : "发送"}
                </button>
              </div>
            </div>
          ) : null}
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
      <div className="relative mx-auto w-full max-w-md bg-zinc-50 lg:hidden">
        <main className="w-full">
          <ChatConversationPanel conversationId={conversationId} showBackButton />
        </main>
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
