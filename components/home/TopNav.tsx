export default function TopNav() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-md items-center gap-3 px-4">
        <div className="shrink-0">
          <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            58韩国
          </span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-3 py-2">
          <SearchIcon />
          <input
            type="search"
            placeholder="搜索租房、攻略、二手..."
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
            readOnly
          />
        </div>

        <button
          type="button"
          aria-label="消息"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <MessageIcon />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.2-3.6C3.45 15.1 3 13.6 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
