"use client";

interface MessageInboxHeaderProps {
  activeTab: "chat" | "contacts";
  onOpenChat: () => void;
  onOpenContacts: () => void;
}

function tabClassName(isActive: boolean) {
  return isActive
    ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
    : "inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200";
}

export default function MessageInboxHeader({
  activeTab,
  onOpenChat,
  onOpenContacts,
}: MessageInboxHeaderProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide lg:px-6"
      data-testid="message-inbox-header"
    >
      <button
        type="button"
        onClick={onOpenContacts}
        aria-current={activeTab === "contacts" ? "page" : undefined}
        className={tabClassName(activeTab === "contacts")}
      >
        <ContactsIcon />
        通讯录
      </button>
      <button
        type="button"
        onClick={onOpenChat}
        aria-current={activeTab === "chat" ? "page" : undefined}
        className={tabClassName(activeTab === "chat")}
      >
        <ChatIcon />
        聊天
      </button>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function ContactsIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}
