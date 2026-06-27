"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNotificationUnreadCountsAction } from "@/lib/actions/notification-counts";
import { NOTIFICATION_UNREAD_REFRESH_EVENT } from "@/lib/messages/unread-events";
import {
  EMPTY_NOTIFICATION_UNREAD_COUNTS,
  type NotificationUnreadCounts,
} from "@/lib/messages/unread-counts";
import { useAuthStore } from "@/lib/store/auth-store";

export function useNotificationUnreadCounts() {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState<NotificationUnreadCounts>(
    EMPTY_NOTIFICATION_UNREAD_COUNTS,
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setCounts(EMPTY_NOTIFICATION_UNREAD_COUNTS);
      return;
    }

    try {
      const next = await fetchNotificationUnreadCountsAction();
      setCounts(next);
    } catch (error) {
      console.error("Failed to load notification unread counts:", error);
      setCounts(EMPTY_NOTIFICATION_UNREAD_COUNTS);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleRefresh() {
      void refresh();
    }

    window.addEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATION_UNREAD_REFRESH_EVENT, handleRefresh);
    };
  }, [refresh]);

  return { counts, refresh };
}
