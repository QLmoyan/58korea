import type { MessageTabId } from "./types";

export const MESSAGE_TABS: Array<{ id: MessageTabId; label: string }> = [
  { id: "comment", label: "评论" },
  { id: "reply", label: "回复" },
  { id: "like", label: "点赞" },
  { id: "system", label: "系统通知" },
];

export const MESSAGE_LOGIN_PROMPT = "登录后查看消息";

export const MESSAGE_EMPTY_TAB = "暂无消息";

export const MESSAGE_EMPTY_REPLY = "暂无回复通知";

export const MESSAGE_EMPTY_SYSTEM = "暂无系统通知，后续版本开放";
