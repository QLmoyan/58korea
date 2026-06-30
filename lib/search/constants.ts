export const SEARCH_DEBOUNCE_MS = 300;

export const SEARCH_PLACEHOLDER = "试试：建大 麻辣烫、江南 理发店";

export const SEARCH_EMPTY_MESSAGE = "没有找到相关内容";

export const SEARCH_EMPTY_USER_MESSAGE = "没有找到相关用户";

export const SEARCH_EMPTY_MERCHANT_MESSAGE = "没有找到相关商家";

export const SEARCH_TABS = [
  { id: "all", label: "综合", enabled: true },
  { id: "users", label: "用户", enabled: true },
  { id: "merchants", label: "商家", enabled: true },
] as const;
