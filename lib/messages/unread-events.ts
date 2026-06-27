export const NOTIFICATION_UNREAD_REFRESH_EVENT = "notification-unread-refresh";

export function dispatchNotificationUnreadRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATION_UNREAD_REFRESH_EVENT));
}
