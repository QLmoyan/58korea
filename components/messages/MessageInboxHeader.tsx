"use client";

interface MessageInboxHeaderProps {
  onOpenContacts: () => void;
  onOpenSystem: () => void;
  systemUnreadCount: number;
}

function formatUnreadBadge(count: number) {
  if (count <= 0) {
    return null;
  }

  return count > 99 ? "99+" : String(count);
}

export default function MessageInboxHeader({
  onOpenContacts,
  onOpenSystem,
  systemUnreadCount,
}: MessageInboxHeaderProps) {
  const systemBadge = formatUnreadBadge(systemUnreadCount);

  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide lg:px-6">
      <button
        type="button"
        onClick={onOpenContacts}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
      >
        <ContactsIcon />
        通讯录
      </button>
      <button
        type="button"
        onClick={onOpenSystem}
        className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
      >
        <SystemIcon />
        系统通知
        {systemBadge ? (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
            {systemBadge}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function ContactsIcon() {
  return (
    <svg
      className="h-4 w-4 text-zinc-500"
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

function SystemIcon() {
  return (
    <svg
      className="h-4 w-4 text-zinc-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}