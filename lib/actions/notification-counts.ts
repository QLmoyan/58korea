"use server";

import { fetchChatUnreadCountAction } from "@/lib/actions/chat";
import {
  buildNotificationUnreadCounts,
  EMPTY_NOTIFICATION_UNREAD_COUNTS,
  type NotificationUnreadCounts,
} from "@/lib/messages/unread-counts";
import {
  createSupabaseServerClient,
  getServerAuthUser,
} from "@/lib/supabase/server";

export async function fetchMessageUnreadCountsAction(): Promise<NotificationUnreadCounts> {
  const user = await getServerAuthUser();
  if (!user) {
    return EMPTY_NOTIFICATION_UNREAD_COUNTS;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("type")
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }

  const notificationCounts = buildNotificationUnreadCounts(data ?? []);
  const chatUnread = await fetchChatUnreadCountAction();

  return {
    ...notificationCounts,
    chatUnread,
    totalUnread: notificationCounts.totalUnread + chatUnread,
  };
}

/** @deprecated Use fetchMessageUnreadCountsAction */
export async function fetchNotificationUnreadCountsAction(): Promise<NotificationUnreadCounts> {
  return fetchMessageUnreadCountsAction();
}
