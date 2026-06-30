"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import MessageContactsEmpty from "@/components/messages/MessageContactsEmpty";
import MessageInboxHeader from "@/components/messages/MessageInboxHeader";
import MessageInboxList from "@/components/messages/MessageInboxList";
import MessageListItem from "@/components/messages/MessageListItem";
import MessageLoginPrompt from "@/components/messages/MessageLoginPrompt";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { CLIENT_FETCH_TIMEOUT_MS, LOADING_UI_DEADLINE_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import { fetchUnifiedInboxAction } from "@/lib/actions/message-inbox";
import {
  fetchInboxDetailNotificationsAction,
  markAllInboxDetailReadAction,
} from "@/lib/actions/notifications";
import {
  INBOX_DETAIL_EMPTY,
  INBOX_DETAIL_TITLES,
  MESSAGE_INBOX_EMPTY,
} from "@/lib/messages/inbox-constants";
import type {
  InboxDetailId,
  MessageCenterView,
  UnifiedInboxItem,
} from "@/lib/messages/inbox-types";
import type { MessageItem } from "@/lib/messages/types";
import { dispatchNotificationUnreadRefresh } from "@/lib/messages/unread-events";
import { getUnreadCountForInboxDetail } from "@/lib/messages/unread-counts";
import { useNotificationUnreadCounts } from "@/lib/messages/use-notification-unread-counts";
import { useAuthStore } from "@/lib/store/auth-store";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

function isInboxDetailView(view: MessageCenterView): view is InboxDetailId {
  return view === "system" || view === "interaction" || view === "like";
}

function MessagePanel({ showBackButton = false }: { showBackButton?: boolean }) {
  const router = useRouter();
  const { user, loading, initError, retryInit } = useAuthStore();
  const { counts: unreadCounts, refresh: refreshUnreadCounts } =
    useNotificationUnreadCounts();
  const [view, setView] = useState<MessageCenterView>("inbox");
  const [inboxItems, setInboxItems] = useState<UnifiedInboxItem[]>([]);
  const [detailItems, setDetailItems] = useState<MessageItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const loadInbox = useCallback(async () => {
    if (!user) {
      setInboxItems([]);
      return;
    }

    setFetching(true);
    setError("");

    try {
      const data = await withTimeout(
        fetchUnifiedInboxAction(),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载消息超时，请检查网络后重试",
      );
      setInboxItems(data);
    } catch (loadError) {
      logClientError("messages.inbox.load", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "加载消息失败",
      );
      setInboxItems([]);
    } finally {
      setFetching(false);
    }
  }, [user]);

  const loadDetail = useCallback(async () => {
    if (!user || !isInboxDetailView(view)) {
      setDetailItems([]);
      return;
    }

    setFetching(true);
    setError("");

    try {
      const data = await withTimeout(
        fetchInboxDetailNotificationsAction(view),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载消息超时，请检查网络后重试",
      );
      setDetailItems(data);
    } catch (loadError) {
      logClientError("messages.detail.load", loadError, { view });
      setError(
        loadError instanceof Error ? loadError.message : "加载消息失败",
      );
      setDetailItems([]);
    } finally {
      setFetching(false);
    }
  }, [user, view]);

  useEffect(() => {
    if (view === "inbox") {
      void loadInbox();
      return;
    }

    if (isInboxDetailView(view)) {
      void loadDetail();
    }
  }, [view, loadInbox, loadDetail]);

  function handleNotificationRead(id: string) {
    setDetailItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    );
    void refreshUnreadCounts();
    dispatchNotificationUnreadRefresh();
    if (view === "inbox") {
      void loadInbox();
    } else if (isInboxDetailView(view)) {
      setInboxItems((current) =>
        current.map((item) => {
          if (item.kind !== "notification" || item.id !== view) {
            return item;
          }

          return {
            ...item,
            unreadCount: Math.max(0, item.unreadCount - 1),
          };
        }),
      );
    }
  }

  async function handleMarkAllRead() {
    if (!isInboxDetailView(view) || detailItems.length === 0) {
      return;
    }

    setMarkingAll(true);
    setError("");

    try {
      await markAllInboxDetailReadAction(view);
      setDetailItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setInboxItems((current) =>
        current.map((item) => {
          if (item.kind !== "notification" || item.id !== view) {
            return item;
          }

          return { ...item, unreadCount: 0 };
        }),
      );
      void refreshUnreadCounts();
      dispatchNotificationUnreadRefresh();
    } catch (markError) {
      setError(
        markError instanceof Error ? markError.message : "标记已读失败",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  function openChat(conversationId: string) {
    router.push(`/messages/chat/${conversationId}`);
  }

  function openDetail(detailId: InboxDetailId) {
    setView(detailId);
    setError("");
  }

  function goBackToInbox() {
    setView("inbox");
    setError("");
    void loadInbox();
  }

  const detailUnreadCount = isInboxDetailView(view)
    ? getUnreadCountForInboxDetail(unreadCounts, view)
    : 0;
  const hasUnreadInDetail = detailUnreadCount > 0;
  const authLoadingOverdue = useLoadingDeadline(loading, LOADING_UI_DEADLINE_MS);
  const authError =
    initError ??
    (authLoadingOverdue ? "登录状态加载超时，请检查网络后重试" : null);
  const waitingForAuth = loading && !authError;
  const waitingForInitialData =
    Boolean(user) &&
    fetching &&
    (view === "inbox" ? inboxItems.length === 0 : detailItems.length === 0) &&
    !error;
  const dataLoadingOverdue = useLoadingDeadline(
    waitingForInitialData,
    CLIENT_FETCH_TIMEOUT_MS + 3_000,
  );
  const dataError =
    error ??
    (dataLoadingOverdue ? "加载消息超时，请检查网络后重试" : null);

  const headerTitle =
    view === "contacts"
      ? "通讯录"
      : isInboxDetailView(view)
        ? INBOX_DETAIL_TITLES[view]
        : "消息";

  const showMarkAllRead =
    user && isInboxDetailView(view) && hasUnreadInDetail;

  return (
    <div className="flex w-full min-h-screen flex-col bg-white lg:min-h-[60vh] lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <div className="border-b border-zinc-100 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {view !== "inbox" ? (
              <button
                type="button"
                onClick={goBackToInbox}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="返回"
              >
                <BackIcon />
              </button>
            ) : showBackButton ? (
              <Link
                href="/"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="返回"
              >
                <BackIcon />
              </Link>
            ) : null}
            <h1 className="text-lg font-semibold text-zinc-900">{headerTitle}</h1>
          </div>

          {showMarkAllRead ? (
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={markingAll}
              className="text-xs font-medium text-rose-500 transition-colors hover:text-rose-600 disabled:opacity-60"
            >
              {markingAll ? "处理中..." : "全部已读"}
            </button>
          ) : null}
        </div>
      </div>

      {waitingForAuth ? (
        <AsyncStatePanel message="加载中..." />
      ) : authError && !user ? (
        <AsyncStatePanel
          message={authError}
          tone="error"
          onRetry={retryInit}
        />
      ) : !user ? (
        <MessageLoginPrompt />
      ) : view === "contacts" ? (
        <MessageContactsEmpty />
      ) : view === "inbox" ? (
        <>
          <MessageInboxHeader
            onOpenContacts={() => setView("contacts")}
            onOpenSystem={() => openDetail("system")}
            systemUnreadCount={unreadCounts.systemUnread}
          />
          {dataError ? (
            <AsyncStatePanel
              message={dataError}
              tone="error"
              onRetry={() => void loadInbox()}
            />
          ) : waitingForInitialData ? (
            <AsyncStatePanel message="加载中..." />
          ) : inboxItems.length === 0 ? (
            <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <p className="text-sm font-medium text-zinc-500">
                {MESSAGE_INBOX_EMPTY}
              </p>
            </section>
          ) : (
            <MessageInboxList
              items={inboxItems}
              onNotificationSelect={openDetail}
              onChatSelect={openChat}
            />
          )}
        </>
      ) : dataError ? (
        <AsyncStatePanel
          message={dataError}
          tone="error"
          onRetry={() => void loadDetail()}
        />
      ) : waitingForInitialData ? (
        <AsyncStatePanel message="加载中..." />
      ) : detailItems.length === 0 ? (
        <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm font-medium text-zinc-500">
            {isInboxDetailView(view) ? INBOX_DETAIL_EMPTY[view] : MESSAGE_INBOX_EMPTY}
          </p>
        </section>
      ) : (
        <div className="divide-y divide-zinc-100 lg:px-6">
          {detailItems.map((item) => (
            <MessageListItem
              key={item.id}
              item={item}
              onRead={handleNotificationRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MessageCenterContent() {
  return (
    <>
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-zinc-50 pb-24 lg:hidden">
        <main className="w-full flex-1">
          <MessagePanel showBackButton />
        </main>
        <BottomNav />
      </div>

      <div className="hidden min-h-screen bg-zinc-50 pl-[220px] pr-[280px] lg:block">
        <DesktopHomeSidebar />
        <DesktopHomeAside />
        <main className="mx-auto w-full max-w-[920px] px-6 py-6">
          <MessagePanel />
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
