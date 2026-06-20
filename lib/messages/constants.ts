import type { MessageTabId } from "./types";

export const MESSAGE_TABS: Array<{ id: MessageTabId; label: string }> = [
  { id: "comment", label: "评论" },
  { id: "reply", label: "回复" },
  { id: "like", label: "点赞" },
  { id: "system", label: "系统通知" },
];

/** V1 placeholder: show unread dot on message entry points. */
export const SHOW_MESSAGE_UNREAD_DOT = true;

export const MESSAGE_LOGIN_PROMPT = "登录后查看消息";

export const MESSAGE_EMPTY_TAB = "暂无消息";
