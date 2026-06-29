"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import DesktopHomeAside from "@/components/home/DesktopHomeAside";
import DesktopHomeSidebar from "@/components/home/DesktopHomeSidebar";
import MessageListItem from "@/components/messages/MessageListItem";
import MessageLoginPrompt from "@/components/messages/MessageLoginPrompt";
import MessageTabs from "@/components/messages/MessageTabs";
import AsyncStatePanel from "@/components/ui/AsyncStatePanel";
import { CLIENT_FETCH_TIMEOUT_MS, LOADING_UI_DEADLINE_MS } from "@/lib/constants/network";
import { useLoadingDeadline } from "@/lib/hooks/use-loading-deadline";
import {
  MESSAGE_EMPTY_REPLY,
  MESSAGE_EMPTY_SYSTEM,
  MESSAGE_EMPTY_TAB,
} from "@/lib/messages/constants";
import type { MessageItem, MessageTabId } from "@/lib/messages/types";
import {
  fetchNotificationsByTabAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/notifications";
import { dispatchNotificationUnreadRefresh } from "@/lib/messages/unread-events";
import { useNotificationUnreadCounts } from "@/lib/messages/use-notification-unread-counts";
import { useAuthStore } from "@/lib/store/auth-store";
import { logClientError } from "@/lib/utils/log-client-error";
import { withTimeout } from "@/lib/utils/with-timeout";

function getEmptyMessage(tab: MessageTabId) {
  switch (tab) {
    case "reply":
      return MESSAGE_EMPTY_REPLY;
    case "system":
      return MESSAGE_EMPTY_SYSTEM;
    default:
      return MESSAGE_EMPTY_TAB;
  }
}

function MessagePanel({ showBackButton = false }: { showBackButton?: boolean }) {
  const { user, loading, initError, retryInit } = useAuthStore();
  const { counts: unreadCounts, refresh: refreshUnreadCounts } =
    useNotificationUnreadCounts();
  const [activeTab, setActiveTab] = useState<MessageTabId>("comment");
  const [items, setItems] = useState<MessageItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const loadItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setFetching(true);
    setError("");

    try {
      const data = await withTimeout(
        fetchNotificationsByTabAction(activeTab),
        CLIENT_FETCH_TIMEOUT_MS,
        "加载消息超时，请检查网络后重试",
      );
      setItems(data);
    } catch (loadError) {
      logClientError("messages.load", loadError, { tab: activeTab });
      setError(
        loadError instanceof Error ? loadError.message : "加载消息失败",
      );
      setItems([]);
    } finally {
      setFetching(false);
    }
  }, [activeTab, user]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function handleNotificationRead(id: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, isRead: true } : item,
      ),
    );
    void refreshUnreadCounts();
    dispatchNotificationUnreadRefresh();
  }

  async function handleMarkAllRead() {
    if (activeTab === "system" || items.length === 0) {
      return;
    }

    setMarkingAll(true);
    setError("");

    try {
      await markAllNotificationsReadAction(activeTab);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
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

  const tabUnreadCount =
    activeTab === "comment"
      ? unreadCounts.commentUnread
      : activeTab === "reply"
        ? unreadCounts.replyUnread
        : activeTab === "like"
          ? unreadCounts.likeUnread
          : unreadCounts.systemUnread;
  const hasUnread = tabUnreadCount > 0;
  const emptyMessage = getEmptyMessage(activeTab);
  const authLoadingOverdue = useLoadingDeadline(loading, LOADING_UI_DEADLINE_MS);
  const authError =
    initError ??
    (authLoadingOverdue ? "登录状态加载超时，请检查网络后重试" : null);
  const waitingForAuth = loading && !authError;
  const waitingForInitialItems =
    Boolean(user) && fetching && items.length === 0 && !error;
  const itemsLoadingOverdue = useLoadingDeadline(
    waitingForInitialItems,
    CLIENT_FETCH_TIMEOUT_MS + 3_000,
  );
  const itemsError =
    error ??
    (itemsLoadingOverdue ? "加载消息超时，请检查网络后重试" : null);

  return (
    <div className="flex w-full min-h-screen flex-col bg-white lg:min-h-[60vh] lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-zinc-100">
      <div className="border-b border-zinc-100 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <Link
                href="/"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="返回"
              >
                <BackIcon />
              </Link>
            ) : null}
            <h1 className="text-lg font-semibold text-zinc-900">消息</h1>
          </div>

          {user && activeTab !== "system" && hasUnread ? (
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

      <MessageTabs
        activeTab={activeTab}
        unreadCounts={unreadCounts}
        onChange={setActiveTab}
      />

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
      ) : itemsError ? (
        <AsyncStatePanel
          message={itemsError}
          tone="error"
          onRetry={() => void loadItems()}
        />
      ) : waitingForInitialItems ? (
        <AsyncStatePanel message="加载中..." />
      ) : items.length === 0 ? (
        <section className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <p className="text-sm font-medium text-zinc-500">{emptyMessage}</p>
        </section>
      ) : (
        <div className="divide-y divide-zinc-100 lg:px-6">
          {items.map((item) => (
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
